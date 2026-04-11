@echo off
setlocal

echo [NS Matrix] Starting local fullstack demo...

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%smart-ja-web"
set "BACKEND_DIR=%ROOT%smart-ja-web\server"

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend not found: %FRONTEND_DIR%
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Backend not found: %BACKEND_DIR%
  pause
  exit /b 1
)

echo [1/2] Installing dependencies...
cd /d "%BACKEND_DIR%"
call npm install
if errorlevel 1 (
  echo [ERROR] Backend dependency install failed.
  pause
  exit /b 1
)

cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
  echo [ERROR] Frontend dependency install failed.
  pause
  exit /b 1
)

echo [2/2] Launching backend + frontend...
start "NS Matrix Backend" cmd /k "cd /d %BACKEND_DIR% && npm run dev"
start "NS Matrix Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

echo.
echo ========================================================
echo   Local demo started.
echo   Frontend: http://localhost:5173
echo   Backend : http://localhost:3005
echo   API Base: /api  (proxied by Vite)
echo ========================================================
pause
