@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo NegoSphere - Full Local Development Start
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found. Install Python 3.10+ first.
  pause
  exit /b 1
)

start "NegoSphere Auth Backend" "%~dp0START_BACKEND.bat"
start "NegoSphere AI Gateway" "%~dp0START_AI_GATEWAY.bat"
start "NegoSphere Frontend" "%~dp0START_FRONTEND.bat"

timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo Services are starting in separate windows.
echo Auth API: http://127.0.0.1:8000/api/health
echo Frontend: http://127.0.0.1:5173
echo.
echo Keep all service windows open.
pause
