from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    APP_ENV: str = "development"
    AUTH_SECRET_KEY: str = ""
    LLM_PROVIDER: str = "gemini"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"
    DATABASE_URL: str = "sqlite:///./negotiation.db"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    MAIL_SERVICE_URL: str = "https://otp-mail-service.vercel.app/api/send-otp"
    MAIL_SERVICE_SECRET: str = ""
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    DEV_SHOW_OTP: bool = False
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT: str = "common"
    OAUTH_CALLBACK_BASE_URL: str = "http://127.0.0.1:8000"
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore", case_sensitive=False)
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    @property
    def smtp_enabled(self) -> bool:
        return bool(self.SMTP_SERVER.strip() and self.SMTP_USERNAME.strip() and self.SMTP_PASSWORD.strip() and self.SMTP_FROM_EMAIL.strip())
    @property
    def email_delivery_enabled(self) -> bool:
        return self.smtp_enabled or bool(self.MAIL_SERVICE_URL.strip() and self.MAIL_SERVICE_SECRET.strip())

settings = Settings()
