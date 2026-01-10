@echo off
echo [Smart JA] Starting Local Demo Environment...

echo [1/2] Installing Dependencies...
cd smart-ja-backend
call npm install
cd ..\smart-ja-web
call npm install
cd ..

echo [2/2] Starting Services...
start "Smart JA Backend" cmd /c "cd smart-ja-backend && npm run dev"
start "Smart JA Frontend" cmd /c "cd smart-ja-web && npm run dev"

echo.
echo ========================================================
echo   Demo is ready! 
echo   Please ensure Node.js is installed.
echo   
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo ========================================================
pause
