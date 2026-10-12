import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    auth_provider = Column(String(50), default="email", nullable=False)  # email, google, github, microsoft
    is_verified = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(String(1000), nullable=True)
    notification_settings_json = Column(String(4000), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    last_login = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    def to_dict(self):
        avatar = self.avatar_url
        if not avatar or "googleusercontent" in avatar or "githubusercontent" in avatar:
            seed = (self.full_name or self.email or "user").replace(" ", "_")
            avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={seed}"

        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "auth_provider": self.auth_provider,
            "is_verified": self.is_verified,
            "avatar_url": avatar,
            "bio": self.bio or "",
            "notification_settings": __import__("json").loads(self.notification_settings_json) if self.notification_settings_json else {
                "emailNotifications": True,
                "negotiationReminders": True,
                "reportNotifications": True,
                "productUpdates": False,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

class OTPToken(Base):
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    purpose = Column(String(50), default="signup", nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
