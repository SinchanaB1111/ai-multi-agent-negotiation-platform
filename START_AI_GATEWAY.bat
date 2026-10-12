@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo NegoSphere AI Gateway
 echo ============================================
echo.
npm run ai-server
pause
