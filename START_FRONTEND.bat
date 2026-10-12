@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo NegoSphere Frontend
echo ============================================
echo.
if not exist "node_modules" (
  echo Installing frontend dependencies...
  npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)
npm run dev
pause
