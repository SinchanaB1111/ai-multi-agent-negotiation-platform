import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status, Query
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode, quote
from typing import Optional

from app.database import get_db
from app.schemas.auth import (
    UserSignUp,
    OTPVerify,
    OTPResend,
    UserSignIn,
    OAuthSignIn,
    UserResponse,
    AuthResponse,
    OTPRequiredResponse,
    PasswordResetRequest,
    PasswordResetVerify,
    PasswordResetConfirm,
    ProfileUpdate,
    NotificationPreferences,
)
from app.services import auth_service
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _authenticated_user(authorization: Optional[str], db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid format.")
    token = authorization.replace("Bearer ", "").strip()
    user_id = auth_service.verify_session_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token session.")
    user = db.query(auth_service.User).filter(auth_service.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

@router.post("/signup", response_model=OTPRequiredResponse)
def signup(payload: UserSignUp, db: Session = Depends(get_db)):
    """Create the account in the database and send an email verification OTP."""
    try:
        user = auth_service.create_unverified_user(
            db,
            full_name=payload.full_name,
            email=payload.email,
            password=payload.password
        )

        otp_code, email_sent = auth_service.create_otp_for_email(
            db,
            email=user.email,
            purpose="signup",
            name=user.full_name,
        )

        if email_sent:
            message = f"A 6-digit verification code has been sent to {user.email}."
            demo_otp = None
        elif settings.APP_ENV.lower() in {"dev", "development", "local"} and settings.DEV_SHOW_OTP:
            # Local development remains usable without an SMTP account.
            # Production never exposes the OTP in an API response.
            message = (
                "Email delivery is not configured. For local development, "
                "use the verification code shown below."
            )
            demo_otp = otp_code
        else:
            raise HTTPException(
                status_code=503,
                detail="Account was created, but the verification email could not be sent. Configure SMTP or the mail service and try again.",
            )

        return OTPRequiredResponse(
            email=user.email,
            requires_otp=True,
            email_sent=email_sent,
            message=message,
            demo_otp=demo_otp,
        )

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(exc)}")

@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    """
    Verifies the 6-digit OTP code sent for signup or login.
    """
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)
    if not user:
        raise HTTPException(status_code=404, detail="User record not found for this email.")

    is_valid, msg = auth_service.verify_otp_code(db, email=email_clean, code=payload.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    user = auth_service.mark_user_verified(db, user)
    token = auth_service.generate_session_token(user.id)

    return AuthResponse(
        token=token,
        user=UserResponse(**user.to_dict()),
        message="Email verified successfully! You are now logged in."
    )

@router.post("/resend-otp", response_model=OTPRequiredResponse)
def resend_otp(payload: OTPResend, db: Session = Depends(get_db)):
    """
    Resends a fresh 6-digit OTP code to the requested email address via SMTP.
    """
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    otp_code, email_sent = auth_service.create_otp_for_email(
        db,
        email=email_clean,
        purpose="resend",
        name=user.full_name
    )

    if not email_sent:
        raise HTTPException(status_code=503, detail="The verification email could not be delivered. Please try again later.")

    msg = (
        f"A new 6-digit OTP code has been sent to {email_clean}."
        if email_sent
        else "A new 6-digit OTP code has been generated."
    )

    return OTPRequiredResponse(
        email=email_clean,
        requires_otp=True,
        email_sent=email_sent,
        message=msg,
    )

@router.post("/forgot-password", response_model=OTPRequiredResponse)
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Start the password reset flow by sending a 6-digit OTP to the account email."""
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)

    # Do not reveal whether an email is registered. The response remains generic.
    if not user:
        return OTPRequiredResponse(
            email=email_clean,
            requires_otp=True,
            email_sent=False,
            message="If an account exists for this email, a verification code has been sent.",
        )

    _, email_sent = auth_service.create_otp_for_email(
        db, email=email_clean, purpose="password_reset", name=user.full_name
    )

    if not email_sent:
        raise HTTPException(
            status_code=503,
            detail="The password reset email could not be delivered. Configure the mail service or SMTP settings and try again.",
        )

    return OTPRequiredResponse(
        email=email_clean,
        requires_otp=True,
        email_sent=True,
        message="A 6-digit password reset code has been sent to your email.",
    )


@router.post("/resend-password-reset-otp", response_model=OTPRequiredResponse)
def resend_password_reset_otp(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Send a fresh password-reset OTP for an existing account."""
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    _, email_sent = auth_service.create_otp_for_email(
        db, email=email_clean, purpose="password_reset", name=user.full_name
    )
    if not email_sent:
        raise HTTPException(status_code=503, detail="The password reset email could not be delivered. Please try again later.")

    return OTPRequiredResponse(
        email=email_clean,
        requires_otp=True,
        email_sent=True,
        message="A new password recovery code has been sent to your email.",
    )


@router.post("/verify-reset-otp")
def verify_reset_otp(payload: PasswordResetVerify, db: Session = Depends(get_db)):
    """Validate a password-reset OTP without consuming it; the confirm call consumes it."""
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    valid, message = auth_service.verify_otp_code(
        db, email=email_clean, code=payload.otp_code, purpose="password_reset", consume=False
    )
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    return {"verified": True, "email": email_clean, "message": "Verification code accepted. Set your new password."}


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Verify the reset OTP and replace the account password atomically."""
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    valid, message = auth_service.verify_otp_code(
        db, email=email_clean, code=payload.otp_code, purpose="password_reset", consume=True
    )
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    user.hashed_password = auth_service.hash_password(payload.new_password)
    user.auth_provider = "email"
    user.is_verified = True
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = auth_service.generate_session_token(user.id)
    return AuthResponse(
        token=token,
        user=UserResponse(**user.to_dict()),
        message="Password reset successfully. You are now signed in.",
    )


@router.post("/signin")
def signin(payload: UserSignIn, db: Session = Depends(get_db)):
    """
    Authenticates a user using email & password. If email is unverified, triggers OTP verification.
    """
    email_clean = payload.email.strip().lower()
    user = auth_service.get_user_by_email(db, email_clean)

    if not user or not auth_service.verify_password(payload.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_verified:
        otp_code, email_sent = auth_service.create_otp_for_email(
            db,
            email=user.email,
            purpose="unverified_login",
            name=user.full_name
        )
        return {
            "requires_otp": True,
            "email": user.email,
            "email_sent": email_sent,
            "message": "Account email is not verified yet. A new verification OTP code has been issued.",
        }

    user.last_login = datetime.datetime.utcnow()
    db.commit()

    token = auth_service.generate_session_token(user.id)

    return AuthResponse(
        token=token,
        user=UserResponse(**user.to_dict()),
        message=f"Welcome back, {user.full_name}!"
    )

@router.get("/config")
def get_auth_config():
    """
    Returns public OAuth Client IDs and config for frontend authentication.
    """
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID,
        "github_client_id": settings.GITHUB_CLIENT_ID,
        "microsoft_client_id": settings.MICROSOFT_CLIENT_ID,
        "smtp_enabled": settings.smtp_enabled
    }

@router.post("/oauth", response_model=AuthResponse)
async def oauth_signin(payload: OAuthSignIn, db: Session = Depends(get_db)):
    """
    Authenticates or creates a user using Google or GitHub OAuth (verifying token with official OAuth APIs).
    """
    provider = payload.provider.lower()
    if provider not in ["google", "github", "microsoft"]:
        raise HTTPException(status_code=400, detail="Supported OAuth providers are 'google', 'github', or 'microsoft'.")

    if not payload.token_or_code:
        raise HTTPException(status_code=401, detail="A verified provider credential is required.")

    email = None
    full_name = None
    avatar_url = None

    # Real OAuth Token / Code Verification
    if payload.token_or_code:
        if provider == "google":
            google_profile = await auth_service.verify_google_oauth_token(payload.token_or_code, redirect_uri=payload.redirect_uri)
            if google_profile and google_profile.get("verified"):
                email = google_profile["email"]
                full_name = google_profile["full_name"]
                avatar_url = google_profile["avatar_url"]
            else:
                raise HTTPException(status_code=400, detail="Google authentication failed. Invalid or expired token/code.")
        elif provider == "github":
            github_profile = await auth_service.exchange_github_oauth_code(payload.token_or_code, redirect_uri=payload.redirect_uri)
            if github_profile and github_profile.get("verified"):
                email = github_profile["email"]
                full_name = github_profile["full_name"]
                avatar_url = github_profile["avatar_url"]
            else:
                raise HTTPException(status_code=400, detail="GitHub authentication failed. Invalid or expired code/token.")
        elif provider == "microsoft":
            microsoft_profile = await auth_service.exchange_microsoft_oauth_code(
                payload.token_or_code,
                redirect_uri=payload.redirect_uri or auth_service.oauth_callback_url("microsoft"),
            )
            if microsoft_profile and microsoft_profile.get("verified"):
                email = microsoft_profile["email"]
                full_name = microsoft_profile["full_name"]
                avatar_url = microsoft_profile.get("avatar_url")
            else:
                raise HTTPException(status_code=400, detail="Microsoft authentication failed. Invalid or expired authorization code.")

    if not email:
        raise HTTPException(status_code=400, detail=f"Valid email required for {provider.capitalize()} sign in.")

    user = auth_service.authenticate_or_create_oauth_user(
        db,
        provider=provider,
        email=email,
        full_name=full_name,
        avatar_url=avatar_url
    )

    token = auth_service.generate_session_token(user.id)

    return AuthResponse(
        token=token,
        user=UserResponse(**user.to_dict()),
        message=f"Signed in via {provider.capitalize()} as {user.full_name}."
    )


@router.get("/oauth/{provider}/start")
def oauth_start(provider: str, frontend_origin: str = Query(...),):
    """Start a real browser OAuth flow for Google, GitHub, or Microsoft."""
    provider = provider.lower().strip()
    if provider not in {"google", "github", "microsoft"}:
        raise HTTPException(status_code=400, detail="Unsupported OAuth provider.")
    if frontend_origin.rstrip("/") not in {origin.rstrip("/") for origin in settings.cors_origins_list}:
        raise HTTPException(status_code=400, detail="This frontend origin is not allowed for OAuth.")

    client_id = {
        "google": settings.GOOGLE_CLIENT_ID,
        "github": settings.GITHUB_CLIENT_ID,
        "microsoft": settings.MICROSOFT_CLIENT_ID,
    }[provider]
    if not client_id:
        raise HTTPException(status_code=503, detail=f"{provider.capitalize()} OAuth is not configured on the server yet.")

    callback = auth_service.oauth_callback_url(provider)
    state = auth_service._oauth_state_payload(provider, frontend_origin.rstrip("/"))

    if provider == "google":
        params = {
            "client_id": client_id,
            "redirect_uri": callback,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "select_account",
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    elif provider == "github":
        params = {
            "client_id": client_id,
            "redirect_uri": callback,
            "scope": "read:user user:email",
            "state": state,
        }
        url = "https://github.com/login/oauth/authorize?" + urlencode(params)
    else:
        params = {
            "client_id": client_id,
            "redirect_uri": callback,
            "response_type": "code",
            "response_mode": "query",
            "scope": "openid profile email User.Read",
            "state": state,
            "prompt": "select_account",
        }
        url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT}/oauth2/v2.0/authorize?" + urlencode(params)

    return RedirectResponse(url=url, status_code=302)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Complete the provider callback and return a NegoSphere session via URL fragment."""
    provider = provider.lower().strip()
    frontend_origin = auth_service.verify_oauth_state(state or "", provider)
    if not frontend_origin:
        raise HTTPException(status_code=400, detail="OAuth state is invalid or expired.")

    if error:
        detail = error_description or error
        return RedirectResponse(
            url=f"{frontend_origin}/#oauth_error={quote(detail)}",
            status_code=302,
        )
    if not code:
        raise HTTPException(status_code=400, detail="OAuth provider did not return an authorization code.")

    callback = auth_service.oauth_callback_url(provider)
    profile = None
    if provider == "google":
        profile = await auth_service.verify_google_oauth_token(code, redirect_uri=callback)
    elif provider == "github":
        profile = await auth_service.exchange_github_oauth_code(code, redirect_uri=callback)
    elif provider == "microsoft":
        profile = await auth_service.exchange_microsoft_oauth_code(code, redirect_uri=callback)
    else:
        raise HTTPException(status_code=400, detail="Unsupported OAuth provider.")

    if not profile or not profile.get("verified") or not profile.get("email"):
        return RedirectResponse(
            url=f"{frontend_origin}/#oauth_error=Unable%20to%20verify%20your%20{provider.capitalize()}%20account.",
            status_code=302,
        )

    user = auth_service.authenticate_or_create_oauth_user(
        db,
        provider=provider,
        email=profile["email"],
        full_name=profile.get("full_name"),
        avatar_url=profile.get("avatar_url"),
    )
    token = auth_service.generate_session_token(user.id)
    # URL fragment keeps the session token out of the HTTP Referer header and server logs.
    redirect_url = f"{frontend_origin}/#oauth_token={token}"
    return RedirectResponse(url=redirect_url, status_code=302)


@router.put("/profile", response_model=UserResponse)
def update_profile(payload: ProfileUpdate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Update the authenticated user's editable profile fields."""
    user = _authenticated_user(authorization, db)
    email_clean = payload.email.strip().lower()
    duplicate = db.query(auth_service.User).filter(
        auth_service.User.email == email_clean, auth_service.User.id != user.id
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="That email address is already in use.")
    user.full_name = payload.full_name.strip()
    user.email = email_clean
    user.bio = (payload.bio or "").strip()
    db.commit()
    db.refresh(user)
    return UserResponse(**user.to_dict())


@router.get("/notifications")
def get_notification_preferences(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _authenticated_user(authorization, db)
    return {"settings": UserResponse(**user.to_dict()).notification_settings}


@router.put("/notifications")
def update_notification_preferences(payload: NotificationPreferences, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _authenticated_user(authorization, db)
    import json
    settings_value = payload.model_dump()
    user.notification_settings_json = json.dumps(settings_value)
    db.commit()
    return {"settings": settings_value, "message": "Notification settings updated successfully."}


@router.get("/me", response_model=UserResponse)
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Returns profile information for currently authenticated user.
    """
    user = _authenticated_user(authorization, db)

    if not user.avatar_url:
        user.avatar_url = auth_service.generate_random_avatar(user.full_name)
        db.commit()
        db.refresh(user)

    return UserResponse(**user.to_dict())

@router.post("/logout")
def logout():
    return {"status": "success", "message": "Successfully logged out."}
