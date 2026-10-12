@echo off
setlocal
cd /d "%~dp0platform-backend"
python -c "from app.config import settings, ENV_FILE; print('ENV:', ENV_FILE); print('SMTP server:', settings.SMTP_SERVER); print('SMTP username configured:', bool(settings.SMTP_USERNAME.strip())); print('SMTP password configured:', bool(settings.SMTP_PASSWORD.strip())); print('SMTP from configured:', bool(settings.SMTP_FROM_EMAIL.strip())); print('SMTP fully configured:', settings.smtp_enabled); print('Email delivery configured:', settings.email_delivery_enabled)"
echo.
echo Do not paste your password into chat.
pause
