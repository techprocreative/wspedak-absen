@echo off
title Attendance System - One Click Deployment with Configuration
color 0D
echo.
echo ========================================
echo  Attendance System One-Click Deploy
echo           with Configuration
echo ========================================
echo.
echo This script will guide you through configuration and deployment
echo of the Attendance System on Windows 10.
echo.

:: Step 1: Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [ERROR] Please run this script as Administrator!
    echo Right-click the script and select "Run as administrator"
    pause
    exit /b 1
)

:: Step 2: Check if configuration exists
if not exist "config\deployment-config.env" (
    echo [INFO] Configuration not found.
    echo.
    echo Starting configuration wizard...
    echo.
    call scripts\deploy\config-wizard.bat
    if %errorLevel% neq 0 (
        echo [ERROR] Configuration wizard failed or was cancelled!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Configuration completed successfully.
) else (
    echo [OK] Configuration found.
    set /p overwrite="Do you want to reconfigure? (y/n): "
    if /i "%overwrite%"=="y" (
        echo.
        echo Starting configuration wizard...
        echo.
        call scripts\deploy\config-wizard.bat
        if %errorLevel% neq 0 (
            echo [ERROR] Configuration wizard failed or was cancelled!
            pause
            exit /b 1
        )
        echo.
        echo [OK] Configuration updated successfully.
    )
)

:: Step 3: Choose deployment type
echo.
echo ========================================
echo       Select Deployment Type
echo ========================================
echo.
echo 1. Local Deployment (from current folder)
echo 2. Full Deployment (downloads latest version)
echo.
set /p deploy_type="Select deployment type (1-2): "

if "%deploy_type%"=="1" (
    echo.
    echo [INFO] Starting Local Deployment...
    call scripts\deploy\local-deploy.bat
) else if "%deploy_type%"=="2" (
    echo.
    echo [INFO] Starting Full Deployment...
    call scripts\deploy\windows-one-click-deploy.bat
) else (
    echo [ERROR] Invalid selection! Please choose 1 or 2.
    pause
    exit /b 1
)

if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo         DEPLOYMENT COMPLETED!
echo ========================================
echo.
echo Your Attendance System is now running and accessible.
echo.
echo Press any key to exit...
pause >nul
exit /b 0