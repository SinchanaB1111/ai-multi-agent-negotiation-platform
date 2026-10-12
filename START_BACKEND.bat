@echo off
setlocal
cd /d "%~dp0platform-backend"
echo ============================================
echo NegoSphere Authentication Backend
echo ============================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found. Install Python 3.10+ first.
  pause
  exit /b 1
)

if not exist ".env" copy /Y ".env.example" ".env" >nul

python -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: Could not install backend dependencies.
  pause
  exit /b 1
)

python -c "from app.config import settings, ENV_FILE; print('Using environment file:', ENV_FILE); print('SMTP configured:', settings.smtp_enabled); print('Email delivery configured:', settings.email_delivery_enabled)"
if errorlevel 1 (
  echo ERROR: Backend configuration could not be loaded.
  pause
  exit /b 1
)

python create_database.py
if errorlevel 1 (
  echo ERROR: Database setup failed.
  pause
  exit /b 1
)

echo.
echo Starting FastAPI on http://127.0.0.1:8000 ...
echo Keep this window open while using NegoSphere.
echo.
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
