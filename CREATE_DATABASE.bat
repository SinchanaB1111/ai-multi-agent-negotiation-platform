@echo off
setlocal
cd /d "%~dp0platform-backend"
echo.
echo ============================================
echo NegoSphere - Create / Verify Database
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
  echo.
  echo ERROR: Python dependencies could not be installed.
  pause
  exit /b 1
)

python create_database.py
if errorlevel 1 (
  echo.
  echo ERROR: Database creation failed.
  pause
  exit /b 1
)

echo.
echo Database setup completed successfully.
pause
