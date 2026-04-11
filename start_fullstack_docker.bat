@echo off
setlocal

echo [NS Matrix] Starting Docker fullstack...

set "ROOT=%~dp0"
set "APP_DIR=%ROOT%smart-ja-web"
set "ENV_FILE=%APP_DIR%\.env.fullstack"
set "ENV_EXAMPLE=%APP_DIR%\.env.fullstack.example"

if not exist "%APP_DIR%\docker-compose.fullstack.yml" (
  echo [ERROR] File not found: %APP_DIR%\docker-compose.fullstack.yml
  pause
  exit /b 1
)

if not exist "%ENV_FILE%" (
  if exist "%ENV_EXAMPLE%" (
    copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
    echo [INFO] Created %ENV_FILE% from example.
  ) else (
    echo [ERROR] Missing env file and example file.
    pause
    exit /b 1
  )
)

cd /d "%APP_DIR%"
docker compose --env-file .env.fullstack -f docker-compose.fullstack.yml up -d --build
if errorlevel 1 (
  echo [ERROR] Docker compose startup failed.
  pause
  exit /b 1
)

echo.
echo [INFO] Current container status:
docker compose -f docker-compose.fullstack.yml ps

echo.
echo ========================================================
echo   Fullstack is up.
echo   App URL (if default env): http://localhost:8080
echo ========================================================
pause
