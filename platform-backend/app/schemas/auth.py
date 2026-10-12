import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_str(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    v_clean = v.strip().lower()
    if not EMAIL_REGEX.match(v_clean):
        raise ValueError("Invalid email address format.")
    return v_clean

class UserSignUp(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=100)

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)

class OTPVerify(BaseModel):
    email: str
    otp_code: str = Field(..., min_length=4, max_length=10)

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)

class OTPResend(BaseModel):
    email: str

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)


class PasswordResetRequest(BaseModel):
    email: str

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)


class PasswordResetVerify(BaseModel):
    email: str
    otp_code: str = Field(..., min_length=4, max_length=10)

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)


class PasswordResetConfirm(BaseModel):
    email: str
    otp_code: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=6, max_length=100)

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)

class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str
    bio: Optional[str] = Field(default="", max_length=1000)

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)

class NotificationPreferences(BaseModel):
    emailNotifications: bool = True
    negotiationReminders: bool = True
    reportNotifications: bool = True
    productUpdates: bool = False

class UserSignIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)

class OAuthSignIn(BaseModel):
    provider: str = Field(..., description="google, github, or microsoft")
    token_or_code: Optional[str] = None
    redirect_uri: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    provider_id: Optional[str] = None

    @field_validator("email")
    def check_email(cls, v):
        return validate_email_str(v)

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    auth_provider: str
    is_verified: bool
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    bio: str = ""
    notification_settings: dict = {}

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    message: str = "Authentication successful"

class OTPRequiredResponse(BaseModel):
    email: str
    requires_otp: bool = True
    email_sent: bool = False
    message: str
    demo_otp: Optional[str] = None
