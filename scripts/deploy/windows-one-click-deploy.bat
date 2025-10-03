@echo off
title Attendance System - One Click Deployment
color 0A
echo.
echo ========================================
echo    Attendance System One-Click Deploy
echo ========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [ERROR] Please run this script as Administrator!
    echo Right-click the script and select "Run as administrator"
    pause
    exit /b 1
)

:: Set variables
set INSTALL_DIR=C:\attendance-system
set NODE_VERSION=18.19.0
set PM2_VERSION=latest
set NGINX_VERSION=1.25.3

echo.
echo [STEP 1] Creating installation directory...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    echo [OK] Created directory: %INSTALL_DIR%
) else (
    echo [INFO] Directory already exists: %INSTALL_DIR%
)

echo.
echo [STEP 2] Checking and installing Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Node.js not found. Installing Node.js %NODE_VERSION%...
    
    :: Download Node.js installer
    echo [INFO] Downloading Node.js installer...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi' -OutFile '%TEMP%\nodejs-installer.msi'"
    
    :: Install Node.js silently
    echo [INFO] Installing Node.js...
    msiexec /i "%TEMP%\nodejs-installer.msi" /quiet /norestart
    
    :: Wait for installation to complete
    timeout /t 30 /nobreak >nul
    
    :: Refresh PATH
    call refreshenv
    
    :: Verify installation
    node --version >nul 2>&1
    if %errorLevel% neq 0 (
        echo [ERROR] Node.js installation failed!
        pause
        exit /b 1
    )
    echo [OK] Node.js installed successfully
) else (
    echo [OK] Node.js is already installed
)

:: Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [INFO] Node.js version: %NODE_VER%

echo.
echo [STEP 3] Checking and installing Git...
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Git not found. Installing Git...
    
    :: Download Git installer
    echo [INFO] Downloading Git installer...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'"
    
    :: Install Git silently
    echo [INFO] Installing Git...
    "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART
    
    :: Wait for installation to complete
    timeout /t 30 /nobreak >nul
    
    :: Refresh PATH
    call refreshenv
    
    :: Verify installation
    git --version >nul 2>&1
    if %errorLevel% neq 0 (
        echo [ERROR] Git installation failed!
        pause
        exit /b 1
    )
    echo [OK] Git installed successfully
) else (
    echo [OK] Git is already installed
)

:: Display Git version
for /f "tokens=*" %%i in ('git --version') do set GIT_VER=%%i
echo [INFO] Git version: %GIT_VER%

echo.
echo [STEP 4] Installing PM2 globally...
call npm install -g pm2@%PM2_VERSION%
if %errorLevel% neq 0 (
    echo [ERROR] PM2 installation failed!
    pause
    exit /b 1
)
echo [OK] PM2 installed successfully

echo.
echo [STEP 5] Checking configuration...
if not exist "%~dp0config\deployment-config.env" (
    echo [ERROR] Configuration not found!
    echo Please run the configuration wizard first:
    echo   scripts\deploy\config-wizard.bat
    pause
    exit /b 1
)

:: Load configuration
echo [INFO] Loading configuration...
for /f "tokens=1,2 delims==" %%a in ("%~dp0config\deployment-config.env") do (
    if not "%%a"=="" if not "%%b"=="" (
        set "%%a=%%b"
    )
)
echo [OK] Configuration loaded

echo.
echo [STEP 6] Setting up application from local directory...
cd /d "%INSTALL_DIR%"

:: Check if we're running from the project directory
if exist "%~dp0package.json" (
    echo [OK] Running from project directory
    set SOURCE_DIR=%~dp0
) else (
    echo [ERROR] Please run this script from the project directory containing package.json
    echo The script should be run from the v0-attendance folder
    pause
    exit /b 1
)

echo [INFO] Source directory: %SOURCE_DIR%
echo [INFO] Installation directory: %INSTALL_DIR%

:: If running from a different directory, copy files
if /i not "%SOURCE_DIR%"=="%INSTALL_DIR%\" (
    echo [INFO] Copying files to installation directory...
    xcopy "%SOURCE_DIR%\*" "%INSTALL_DIR%\" /E /H /C /I /Y
    echo [OK] Files copied successfully
) else (
    echo [OK] Already in installation directory
)

echo.
echo [STEP 6] Installing application dependencies...
call npm install --production
if %errorLevel% neq 0 (
    echo [ERROR] Dependency installation failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully

echo.
echo [STEP 7] Downloading face recognition models...
if not exist "public\models\ssd_mobilenetv1_model-weights_manifest.json" (
    echo [INFO] Downloading face recognition models...
    powershell -ExecutionPolicy Bypass -File "scripts\download-face-models.ps1"
    if %errorLevel% neq 0 (
        echo [WARNING] Face models download failed, but continuing...
    ) else (
        echo [OK] Face recognition models downloaded
    )
) else (
    echo [OK] Face recognition models already exist
)

echo.
echo [STEP 9] Creating environment configuration...
echo [INFO] Creating .env.production file from configuration...
(
    echo # Production Configuration
    echo # Generated by Attendance System Deployment Script
    echo # Date: %date% %time%
    echo.
    echo # Application Configuration
    echo NODE_ENV=%NODE_ENV%
    echo HOST=%HOST%
    echo PORT=%PORT%
    echo NEXT_PUBLIC_APP_NAME=%NEXT_PUBLIC_APP_NAME%
    echo.
    echo # Supabase Configuration
    echo NEXT_PUBLIC_SUPABASE_URL=%NEXT_PUBLIC_SUPABASE_URL%
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%NEXT_PUBLIC_SUPABASE_ANON_KEY%
    echo SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY%
    echo.
    echo # Security Configuration
    echo JWT_SECRET=%JWT_SECRET%
    echo.
    echo # Performance Configuration
    echo NODE_OPTIONS=%NODE_OPTIONS%
    echo ENABLE_COMPRESSION=%ENABLE_COMPRESSION%
    echo ENABLE_CACHING=%ENABLE_CACHING%
    echo LOG_LEVEL=%LOG_LEVEL%
) > .env.production

:: Add email configuration if provided
if not "%SMTP_HOST%"=="" (
    (
        echo.
        echo # Email Configuration
        echo SMTP_HOST=%SMTP_HOST%
        echo SMTP_PORT=%SMTP_PORT%
        echo SMTP_USER=%SMTP_USER%
        echo SMTP_PASS=%SMTP_PASS%
        echo EMAIL_FROM=%EMAIL_FROM%
    ) >> .env.production
)

echo [OK] Created .env.production file with your configuration

echo.
echo [STEP 9] Building the application...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Application build failed!
    pause
    exit /b 1
)
echo [OK] Application built successfully

echo.
echo [STEP 11] Creating PM2 configuration...
(
    echo const path = require('path');
    echo.
    echo module.exports = {
    echo   apps: [{
    echo     name: 'attendance-system',
    echo     script: 'npm',
    echo     args: 'start',
    echo     cwd: path.resolve(__dirname),
    echo     instances: 1,
    echo     autorestart: true,
    echo     watch: false,
    echo     max_memory_restart: '1G',
    echo     env: {
    echo       NODE_ENV: '%NODE_ENV%',
    echo       HOST: '%HOST%',
    echo       PORT: '%PORT%'
    echo     },
    echo     error_file: 'C:/attendance-system/logs/err.log',
    echo     out_file: 'C:/attendance-system/logs/out.log',
    echo     log_file: 'C:/attendance-system/logs/combined.log',
    echo     time: true
    echo   }]
    echo };
) > ecosystem.config.js
echo [OK] Created PM2 configuration

echo.
echo [STEP 11] Creating logs directory...
if not exist "logs" mkdir logs
echo [OK] Created logs directory

echo.
echo [STEP 12] Starting the application with PM2...
call pm2 start ecosystem.config.js --env production
if %errorLevel% neq 0 (
    echo [ERROR] Failed to start application with PM2!
    pause
    exit /b 1
)
echo [OK] Application started successfully

echo.
echo [STEP 13] Setting up PM2 to start on Windows boot...
call pm2 startup
call pm2 save
echo [OK] PM2 configured to start on Windows boot

echo.
echo [STEP 14] Configuring Windows Firewall...
:: Allow port through firewall
netsh advfirewall firewall add rule name="Attendance System" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Firewall rule added for port %PORT%
) else (
    echo [WARNING] Failed to add firewall rule. You may need to configure it manually.
)

echo.
echo [STEP 15] Getting IP address for network access...
if not "%CUSTOM_IP%"=="" (
    set IP_ADDR=%CUSTOM_IP%
    echo [INFO] Using custom IP address: %IP_ADDR%
) else (
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "ipv4"') do set IP_ADDR=%%i
    set IP_ADDR=%IP_ADDR: =%
    echo [INFO] Auto-detected IP address: %IP_ADDR%
)

echo.
echo ========================================
echo         DEPLOYMENT COMPLETED!
echo ========================================
echo.
echo Application is now running and accessible at:
echo   Local:    http://localhost:%PORT%
echo   Network:  http://%IP_ADDR%:%PORT%
echo.
echo Application Name: %NEXT_PUBLIC_APP_NAME%
echo.
echo Default login credentials:
echo   Email:    admin@test.com
echo   Password: admin123
echo.
echo IMPORTANT:
echo 1. Change the default password after first login!
echo 2. Your Supabase credentials are already configured
echo 3. Configure your Supabase project at: https://app.supabase.com/
echo.
echo Management commands:
echo   pm2 status          - Check application status
echo   pm2 logs            - View application logs
echo   pm2 restart         - Restart application
echo   pm2 stop            - Stop application
echo.
echo Press any key to open the application in browser...
pause >nul

:: Open application in default browser
start http://%IP_ADDR%:%PORT%

echo.
echo Thank you for using Attendance System!
echo For support, please check the documentation.
echo.
pause