@echo off
set PROJ=%~dp0

echo ===================================
echo   NS Matrix Dev Recovery Cluster
echo ===================================

:: Start Backend
echo [1/2] BACKEND...
start "NS_Backend" cmd /k cd /d "%PROJ%server" ^&^& npm run dev

:: Start Frontend
echo [2/2] FRONTEND...
start "NS_Frontend" cmd /k cd /d "%PROJ%" ^&^& npm run dev

:: Open Browser
echo [Ready] Opening browser soon...
timeout /t 8
start http://localhost:5173/login

pause
