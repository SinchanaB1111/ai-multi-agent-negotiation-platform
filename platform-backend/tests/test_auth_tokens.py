import time
import asyncio

import pytest
from fastapi import HTTPException

from app.api.auth import oauth_signin
from app.schemas.auth import OAuthSignIn
from app.services import auth_service


def test_session_token_round_trip():
    token = auth_service.generate_session_token(42)

    assert auth_service.verify_session_token(token) == 42


def test_development_signing_key_is_stable_when_not_configured():
    if auth_service.settings.AUTH_SECRET_KEY or auth_service.settings.APP_ENV.lower() in {"prod", "production"}:
        pytest.skip("The configured production signing key should be used instead of the development fallback.")

    assert auth_service.SESSION_SIGNING_KEY == auth_service.DEVELOPMENT_SESSION_SIGNING_KEY


def test_session_token_rejects_tampering():
    token = auth_service.generate_session_token(42)
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")

    assert auth_service.verify_session_token(tampered) is None


def test_session_token_expires(monkeypatch):
    now = int(time.time())
    monkeypatch.setattr(auth_service.time, "time", lambda: now)
    token = auth_service.generate_session_token(42)

    assert auth_service.verify_session_token(token, now + auth_service.SESSION_TTL_SECONDS) is None


def test_session_token_rejects_unsigned_legacy_token():
    assert auth_service.verify_session_token("nego_token_42_forged") is None


def test_oauth_rejects_unverified_identity_claims():
    payload = OAuthSignIn(
        provider="google",
        email="victim@example.com",
        full_name="Victim",
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(oauth_signin(payload, db=None))

    assert error.value.status_code == 401