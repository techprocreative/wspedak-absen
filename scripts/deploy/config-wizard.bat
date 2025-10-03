@echo off
title Attendance System - Configuration Wizard
color 0E
echo.
echo ========================================
echo    Attendance System Configuration
echo ========================================
echo.
echo This wizard will help you configure the required credentials
echo before installing the application.
echo.

:: Create config directory if it doesn't exist
if not exist "config" mkdir config

:: Check if config file already exists
if exist "config\deployment-config.env" (
    echo [INFO] Existing configuration found.
    echo.
    set /p overwrite="Do you want to overwrite existing configuration? (y/n): "
    if /i not "%overwrite%"=="y" (
        echo [INFO] Using existing configuration.
        goto :verify_config
    )
)

echo.
echo [STEP 1] Supabase Configuration
echo ========================================
echo.
echo Please provide your Supabase project credentials.
echo You can find these in your Supabase dashboard:
echo 1. Go to https://app.supabase.com/
echo 2. Select your project
echo 3. Go to Settings → API
echo.
set /p supabase_url="Enter Supabase Project URL: "
set /p supabase_anon="Enter Supabase Anon Key: "
set /p supabase_service="Enter Supabase Service Role Key: "

echo.
echo [STEP 2] Security Configuration
echo ========================================
echo.
echo Please provide a secure JWT secret (minimum 32 characters).
echo This will be used to secure your application.
echo.
set /p jwt_secret="Enter JWT Secret (min 32 characters): "

:: Validate JWT secret length
if "%jwt_secret%"=="" (
    echo [ERROR] JWT Secret cannot be empty!
    goto :step2
)
for /f "delims=" %%A in ('echo "%jwt_secret%" ^| find /c /v ""') do set length=%%A
if %length% lss 32 (
    echo [ERROR] JWT Secret must be at least 32 characters!
    goto :step2
)

:step3
echo.
echo [STEP 3] Application Configuration
echo ========================================
echo.
set /p app_name="Enter Application Name (default: Attendance System): "
if "%app_name%"=="" set app_name=Attendance System

set /p app_port="Enter Application Port (default: 3000): "
if "%app_port%"=="" set app_port=3000

echo.
echo [STEP 4] Network Configuration
echo ========================================
echo.
echo The installer will automatically detect your IP address.
echo You can also specify a custom IP address if needed.
echo.
set /p custom_ip="Enter Custom IP Address (leave empty to auto-detect): "

echo.
echo [STEP 5] Email Configuration (Optional)
echo ========================================
echo.
echo Configure email settings for notifications.
echo Leave empty to skip email configuration.
echo.
set /p smtp_host="Enter SMTP Host (optional): "
if not "%smtp_host%"=="" (
    set /p smtp_port="Enter SMTP Port (default: 587): "
    if "%smtp_port%"=="" set smtp_port=587
    set /p smtp_user="Enter SMTP Username: "
    set /p smtp_pass="Enter SMTP Password: "
    set /p email_from="Enter From Email Address: "
)

echo.
echo [STEP 6] Advanced Configuration (Optional)
echo ========================================
echo.
echo Configure advanced settings.
echo Leave empty to use default values.
echo.
set /p node_options="Enter Node.js Options (default: --max-old-space-size=2048): "
if "%node_options%"=="" set node_options=--max-old-space-size=2048

set /p log_level="Enter Log Level (default: warn): "
if "%log_level%"=="" set log_level=warn

echo.
echo [STEP 7] Save Configuration
echo ========================================
echo.

:: Create configuration file
(
    echo # Attendance System Deployment Configuration
    echo # Generated on: %date% %time%
    echo.
    echo # Supabase Configuration
    echo NEXT_PUBLIC_SUPABASE_URL=%supabase_url%
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%supabase_anon%
    echo SUPABASE_SERVICE_ROLE_KEY=%supabase_service%
    echo.
    echo # Security Configuration
    echo JWT_SECRET=%jwt_secret%
    echo.
    echo # Application Configuration
    echo NEXT_PUBLIC_APP_NAME="%app_name%"
    echo PORT=%app_port%
    echo HOST=0.0.0.0
    echo.
    echo # Network Configuration
    echo CUSTOM_IP=%custom_ip%
    echo.
    echo # Email Configuration
    echo SMTP_HOST=%smtp_host%
    echo SMTP_PORT=%smtp_port%
    echo SMTP_USER=%smtp_user%
    echo SMTP_PASS=%smtp_pass%
    echo EMAIL_FROM=%email_from%
    echo.
    echo # Advanced Configuration
    echo NODE_OPTIONS=%node_options%
    echo LOG_LEVEL=%log_level%
    echo NODE_ENV=production
    echo ENABLE_COMPRESSION=true
    echo ENABLE_CACHING=true
) > config\deployment-config.env

echo [OK] Configuration saved to config\deployment-config.env

:verify_config
echo.
echo ========================================
echo       Configuration Summary
echo ========================================
echo.
for /f "tokens=1,2 delims==" %%a in (config\deployment-config.env) do (
    if not "%%a"=="" if not "%%b"=="" (
        if "%%a"=="SMTP_PASS" (
            echo %%a: [HIDDEN]
        ) else if "%%a"=="SUPABASE_SERVICE_ROLE_KEY" (
            echo %%a: %%b:~0,20%...
        ) else (
            echo %%a: %%b
        )
    )
)
echo.
set /p confirm="Is this configuration correct? (y/n): "
if /i not "%confirm%"=="y" (
    echo.
    echo [INFO] Please re-run the wizard to correct your configuration.
    pause
    exit /b 1
)

echo.
echo [OK] Configuration verified successfully!
echo.
echo You can now run the deployment script:
echo - For local deployment: local-deploy.bat
echo - For full deployment: windows-one-click-deploy.bat
echo.
echo Press any key to exit...
pause >nul
exit /b 0