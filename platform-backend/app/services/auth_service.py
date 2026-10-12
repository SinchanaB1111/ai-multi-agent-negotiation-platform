import hashlib
import base64
import hmac
import json
import os
import random
import datetime
import secrets
import time
import logging
import httpx
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User, OTPToken
from app.services import email_service
from app.config import settings

logger = logging.getLogger("auth_service")

if not settings.AUTH_SECRET_KEY and settings.APP_ENV.lower() in {"prod", "production"}:
    raise RuntimeError("AUTH_SECRET_KEY must be configured in production.")

DEVELOPMENT_SESSION_SIGNING_KEY = b"negosphere-development-only-session-key"
SESSION_SIGNING_KEY = settings.AUTH_SECRET_KEY.encode("utf-8") or DEVELOPMENT_SESSION_SIGNING_KEY
SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

# Password Hashing Utilities using hashlib pbkdf2_hmac
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex() + ":" + pwd_hash.hex()

def verify_password(password: str, stored_password_hash: str) -> bool:
    if not stored_password_hash or ":" not in stored_password_hash:
        return False
    try:
        salt_hex, hash_hex = stored_password_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return pwd_hash.hex() == hash_hex
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

# Token Generation
def generate_session_token(user_id: int) -> str:
    payload = {
        "sub": int(user_id),
        "exp": int(time.time()) + SESSION_TTL_SECONDS,
        "nonce": secrets.token_urlsafe(24),
    }
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signing_input = f"nego_session.{encoded_payload}"
    signature = hmac.new(
        SESSION_SIGNING_KEY, signing_input.encode("ascii"), hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{signing_input}.{encoded_signature}"


def verify_session_token(token: str, now: Optional[int] = None) -> Optional[int]:
    try:
        prefix, encoded_payload, encoded_signature = token.split(".")
        if prefix != "nego_session":
            return None

        signing_input = f"{prefix}.{encoded_payload}"
        expected_signature = hmac.new(
            SESSION_SIGNING_KEY, signing_input.encode("ascii"), hashlib.sha256
        ).digest()
        supplied_signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
        if not hmac.compare_digest(expected_signature, supplied_signature):
            return None

        payload_bytes = base64.urlsafe_b64decode(
            encoded_payload + "=" * (-len(encoded_payload) % 4)
        )
        payload = json.loads(payload_bytes)
        user_id = int(payload["sub"])
        expires_at = int(payload["exp"])
        if user_id <= 0 or expires_at <= (int(time.time()) if now is None else now):
            return None
        return user_id
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return None

# OTP Generation & Dispatch
def create_otp_for_email(db: Session, email: str, purpose: str = "signup", name: str = "User") -> Tuple[str, bool]:
    # Generate 6-digit OTP code
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    # Invalidate previous unused OTPs for this email
    db.query(OTPToken).filter(
        OTPToken.email == email,
        OTPToken.is_used == False
    ).update({"is_used": True})

    otp_entry = OTPToken(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_entry)
    db.commit()
    db.refresh(otp_entry)

    logger.info("Generated OTP for %s (%s); expires at %s", email, purpose, expires_at)
    # Dispatch via Vercel Mail Service (with SMTP fallback)
    email_sent, email_msg = email_service.send_otp_email(to_email=email, otp_code=code, name=name)


    return code, email_sent

def verify_otp_code(db: Session, email: str, code: str, purpose: Optional[str] = None, consume: bool = True) -> Tuple[bool, str]:
    cleaned_code = code.strip()
    query = db.query(OTPToken).filter(
        OTPToken.email == email,
        OTPToken.code == cleaned_code,
        OTPToken.is_used == False
    )
    if purpose:
        query = query.filter(OTPToken.purpose == purpose)
    otp_record = query.order_by(OTPToken.created_at.desc()).first()

    if not otp_record:
        return False, "Invalid or expired OTP code."

    now = datetime.datetime.utcnow()
    if otp_record.expires_at < now:
        otp_record.is_used = True
        db.commit()
        return False, "OTP code has expired. Please request a new one."

    # Mark as used only when the caller is completing the protected action.
    if consume:
        otp_record.is_used = True
        db.commit()
    return True, "OTP verified successfully."

# Real Google OAuth Token & Code Verification
async def verify_google_oauth_token(id_token_or_access_token: str, redirect_uri: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google ID Token, Access Token, or Authorization Code directly with Google's official OAuth servers.
    """
    if not id_token_or_access_token:
        return None

    token = id_token_or_access_token.strip()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Try Google ID Token Info Endpoint
            tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
            res = await client.get(tokeninfo_url)

            if res.status_code == 200:
                data = res.json()
                email = data.get("email")
                audience_ok = (not settings.GOOGLE_CLIENT_ID) or data.get("aud") == settings.GOOGLE_CLIENT_ID
                if email and audience_ok:
                    return {
                        "email": email,
                        "full_name": data.get("name") or data.get("given_name") or email.split("@")[0],
                        "avatar_url": data.get("picture"),
                        "verified": data.get("email_verified") in [True, "true", "True", 1]
                    }

            # 2. Try Google UserInfo Access Token Endpoint
            userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            res2 = await client.get(userinfo_url, headers={"Authorization": f"Bearer {token}"})
            if res2.status_code == 200:
                data2 = res2.json()
                email2 = data2.get("email")
                if email2:
                    return {
                        "email": email2,
                        "full_name": data2.get("name") or email2.split("@")[0],
                        "avatar_url": data2.get("picture"),
                        "verified": data2.get("email_verified") in [True, "true", "True", 1]
                    }

            # 3. If token is a Google authorization code and Client credentials exist
            if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
                token_exchange_url = "https://oauth2.googleapis.com/token"
                exchange_data = {
                    "code": token,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri or "http://localhost:5173/oauth/callback/google"
                }
                res3 = await client.post(token_exchange_url, data=exchange_data)
                if res3.status_code == 200:
                    tok_res = res3.json()
                    access_tok = tok_res.get("access_token")
                    id_tok = tok_res.get("id_token")
                    if id_tok:
                        return await verify_google_oauth_token(id_tok, redirect_uri)
                    elif access_tok:
                        return await verify_google_oauth_token(access_tok, redirect_uri)
    except Exception as exc:
        logger.error(f"Google OAuth token verification failed: {exc}")

    return None

# Real GitHub OAuth Code & Token Exchange
async def exchange_github_oauth_code(code_or_token: str, redirect_uri: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Exchanges GitHub OAuth 'code' for access token (or uses access token directly) and fetches authenticated GitHub user profile & primary email.
    """
    if not code_or_token:
        return None

    cleaned = code_or_token.strip()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            access_token = None

            # Check if it's already a GitHub access token or PAT
            if cleaned.startswith("ghp_") or cleaned.startswith("gho_") or cleaned.startswith("github_pat_"):
                access_token = cleaned
            elif settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
                # Exchange code for token
                token_url = "https://github.com/login/oauth/access_token"
                payload = {
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": cleaned,
                }
                if redirect_uri:
                    payload["redirect_uri"] = redirect_uri

                headers = {"Accept": "application/json"}
                res = await client.post(token_url, json=payload, headers=headers)

                if res.status_code == 200:
                    token_data = res.json()
                    access_token = token_data.get("access_token")
                else:
                    logger.error(f"GitHub token exchange returned status {res.status_code}: {res.text}")

            if not access_token:
                access_token = cleaned

            # Fetch User Profile from GitHub API
            auth_header = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"}
            user_res = await client.get("https://api.github.com/user", headers=auth_header)
            if user_res.status_code != 200:
                logger.error(f"GitHub user profile fetch returned status {user_res.status_code}: {user_res.text}")
                return None

            github_user = user_res.json()
            email = github_user.get("email")

            # If primary email is private in GitHub profile, fetch from /user/emails endpoint
            if not email:
                email_res = await client.get("https://api.github.com/user/emails", headers=auth_header)
                if email_res.status_code == 200:
                    emails = email_res.json()
                    primary_email_obj = next((e for e in emails if e.get("primary") and e.get("verified")), None)
                    if not primary_email_obj and emails:
                        primary_email_obj = emails[0]
                    if primary_email_obj:
                        email = primary_email_obj.get("email")

            if email:
                return {
                    "email": email,
                    "full_name": github_user.get("name") or github_user.get("login"),
                    "avatar_url": github_user.get("avatar_url"),
                    "verified": True
                }
    except Exception as exc:
        logger.error(f"GitHub OAuth code exchange failed: {exc}")

    return None



# OAuth browser-flow helpers -------------------------------------------------
OAUTH_STATE_TTL_SECONDS = 10 * 60

def _oauth_state_payload(provider: str, frontend_origin: str) -> str:
    payload = {
        "provider": provider,
        "frontend_origin": frontend_origin,
        "exp": int(time.time()) + OAUTH_STATE_TTL_SECONDS,
        "nonce": secrets.token_urlsafe(24),
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        SESSION_SIGNING_KEY,
        f"nego_oauth.{encoded}".encode("ascii"),
        hashlib.sha256,
    ).digest()
    signed = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{encoded}.{signed}"


def verify_oauth_state(state: str, provider: str) -> Optional[str]:
    try:
        encoded, supplied_signature = state.split(".", 1)
        signing_input = f"nego_oauth.{encoded}"
        expected = hmac.new(
            SESSION_SIGNING_KEY,
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
        supplied = base64.urlsafe_b64decode(
            supplied_signature + "=" * (-len(supplied_signature) % 4)
        )
        if not hmac.compare_digest(expected, supplied):
            return None
        payload = json.loads(
            base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode("utf-8")
        )
        if payload.get("provider") != provider or int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload.get("frontend_origin")
    except Exception:
        return None


def oauth_callback_url(provider: str) -> str:
    return f"{settings.OAUTH_CALLBACK_BASE_URL.rstrip('/')}/api/auth/oauth/{provider}/callback"


async def exchange_microsoft_oauth_code(code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
    if not code or not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_CLIENT_SECRET:
        return None
    try:
        token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT}/oauth2/v2.0/token"
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(
                token_url,
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "scope": "openid profile email User.Read",
                },
            )
            if token_res.status_code != 200:
                logger.error("Microsoft token exchange failed: %s", token_res.text)
                return None
            access_token = token_res.json().get("access_token")
            if not access_token:
                return None

            profile_res = await client.get(
                "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_res.status_code != 200:
                logger.error("Microsoft profile request failed: %s", profile_res.text)
                return None
            profile = profile_res.json()
            email = (profile.get("mail") or profile.get("userPrincipalName") or "").strip().lower()
            if not email:
                return None
            return {
                "email": email,
                "full_name": profile.get("displayName") or email.split("@")[0],
                "avatar_url": None,
                "verified": True,
            }
    except Exception as exc:
        logger.error("Microsoft OAuth exchange failed: %s", exc)
        return None

AVATAR_STYLES = [
    "bottts",
    "avataaars",
    "lorelei",
    "micah",
    "adventurer",
    "fun-emoji",
    "personas",
    "big-smile",
    "big-ears"
]

def generate_random_avatar(seed_text: Optional[str] = None) -> str:
    """
    Generates a random SVG avatar URL using Dicebear 7.x API with a variety of vector styles.
    """
    style = random.choice(AVATAR_STYLES)
    random_id = secrets.token_hex(4)
    seed = f"{seed_text or 'user'}_{random_id}".replace(" ", "_")
    return f"https://api.dicebear.com/7.x/{style}/svg?seed={seed}"

# User Operations
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.strip().lower()).first()

def create_unverified_user(db: Session, full_name: str, email: str, password: str) -> User:
    email_clean = email.strip().lower()
    existing = get_user_by_email(db, email_clean)
    pwd_hash = hash_password(password)

    if existing:
        if existing.is_verified:
            raise ValueError("An account with this email already exists and is verified. Please Sign In instead.")
        # Update existing unverified user credentials
        existing.full_name = full_name.strip()
        existing.hashed_password = pwd_hash
        existing.auth_provider = "email"
        if not existing.avatar_url:
            existing.avatar_url = generate_random_avatar(full_name)
        db.commit()
        db.refresh(existing)
        return existing

    user = User(
        email=email_clean,
        full_name=full_name.strip(),
        hashed_password=pwd_hash,
        auth_provider="email",
        is_verified=False,
        avatar_url=generate_random_avatar(full_name)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def mark_user_verified(db: Session, user: User) -> User:
    user.is_verified = True
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

def authenticate_or_create_oauth_user(
    db: Session,
    provider: str,
    email: str,
    full_name: Optional[str] = None,
    avatar_url: Optional[str] = None
) -> User:
    email_clean = email.strip().lower()
    user = get_user_by_email(db, email_clean)

    name = full_name.strip() if full_name else email_clean.split("@")[0].capitalize()
    random_avatar = generate_random_avatar(name)

    if user:
        # Update last login & verified status (OAuth emails are auto-verified)
        user.is_verified = True
        user.last_login = datetime.datetime.utcnow()
        # Always replace Google/GitHub profile picture or missing avatar with random avatar
        if not user.avatar_url or "googleusercontent" in user.avatar_url or "githubusercontent" in user.avatar_url:
            user.avatar_url = random_avatar
        db.commit()
        db.refresh(user)
        return user

    user = User(
        email=email_clean,
        full_name=name,
        hashed_password=None,
        auth_provider=provider.lower(),
        is_verified=True,
        avatar_url=random_avatar
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
