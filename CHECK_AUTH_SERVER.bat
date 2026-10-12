@echo off
setlocal
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 5; Write-Host 'NegoSphere backend is ONLINE.' -ForegroundColor Green; $r | Format-List } catch { Write-Host 'NegoSphere backend is NOT running on port 8000.' -ForegroundColor Red; Write-Host 'Start START_BACKEND.bat first.' }"
pause
