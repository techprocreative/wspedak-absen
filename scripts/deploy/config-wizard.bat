@echo off
setlocal enabledelayedexpansion
title Attendance System - Configuration Wizard
color 0E

:: Initialize error handling
set "LOG_FILE=config\config-wizard.log"
set "ERROR_COUNT=0"
set "MAX_RETRIES=3"

:: Create log file
if not exist "config" (
    mkdir config 2>nul
    if errorlevel 1 (
        echo [ERROR] Failed to create config directory. Please check permissions.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

:: Initialize log
echo [%date% %time%] Configuration Wizard Started > "%LOG_FILE%"

echo.
echo ========================================
echo    Attendance System Configuration
echo ========================================
echo.
echo This wizard will help you configure the required credentials
echo before installing the application.
echo.
echo [INFO] Log file: %LOG_FILE%
echo.

:: Function to log messages
:log_message
set "message=%~1"
echo [%date% %time%] %message% >> "%LOG_FILE%"
goto :eof

:: Function to display error and increment counter
:show_error
set "error_msg=%~1"
echo [ERROR] %error_msg%
call :log_message "ERROR: %error_msg%"
set /a ERROR_COUNT+=1
goto :eof

:: Function to ask for retry
:ask_retry
set "action=%~1"
set "retry_count=%~2"
if !retry_count! geq %MAX_RETRIES% (
    echo [ERROR] Maximum retries exceeded for %action%
    call :log_message "Maximum retries exceeded for %action%"
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)
echo.
set /p retry_choice="Would you like to retry? (y/n): "
if /i "!retry_choice!"=="y" (
    call :log_message "User chose to retry %action% (attempt !retry_count!)"
    goto :eof
)
if /i "!retry_choice!"=="n" (
    call :log_message "User chose not to retry %action%"
    echo [INFO] Exiting configuration wizard...
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)
echo [WARNING] Please enter 'y' or 'n'.
goto :ask_retry

:: Check if config file already exists
if exist "config\deployment-config.env" (
    echo [INFO] Existing configuration found.
    echo.

    :ask_overwrite
    set /p overwrite="Do you want to overwrite existing configuration? (y/n): "
    if /i "!overwrite!"=="y" goto :create_backup
    if /i "!overwrite!"=="n" (
        echo [INFO] Using existing configuration.
        call :log_message "Using existing configuration"
        goto :verify_config
    )
    echo [WARNING] Please enter 'y' or 'n'.
    goto :ask_overwrite
)

:create_backup
:: Create backup of existing configuration
if exist "config\deployment-config.env" (
    set "backup_file=config\deployment-config.env.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
    set "backup_file=!backup_file: =0!"
    copy "config\deployment-config.env" "!backup_file!" >nul 2>&1
    if errorlevel 1 (
        call :show_error "Failed to create backup of existing configuration"
        echo [WARNING] Continuing without backup...
    ) else (
        echo [INFO] Backup created: !backup_file!
        call :log_message "Backup created: !backup_file!"
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

:supabase_url_input
set "supabase_url="
set "url_retry_count=0"

:url_retry_loop
set /a url_retry_count+=1
set /p supabase_url="Enter Supabase Project URL: "
if "!supabase_url!"=="" (
    call :show_error "Supabase URL cannot be empty"
    call :ask_retry "Supabase URL input" !url_retry_count!
    goto :url_retry_loop
)

:: Validate URL format (basic check)
echo !supabase_url! | findstr /r "^https://[a-zA-Z0-9.-]*\.supabase\.co$" >nul 2>&1
if errorlevel 1 (
    call :show_error "Invalid Supabase URL format. Expected: https://xxxxx.supabase.co"
    call :ask_retry "Supabase URL validation" !url_retry_count!
    goto :url_retry_loop
)

call :log_message "Supabase URL entered: !supabase_url!"

:supabase_anon_input
set "supabase_anon="
set "anon_retry_count=0"

:anon_retry_loop
set /a anon_retry_count+=1
set /p supabase_anon="Enter Supabase Anon Key: "
if "!supabase_anon!"=="" (
    call :show_error "Supabase Anon Key cannot be empty"
    call :ask_retry "Supabase Anon Key input" !anon_retry_count!
    goto :anon_retry_loop
)

:: Basic validation for JWT token format
echo !supabase_anon! | findstr /r "^[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$" >nul 2>&1
if errorlevel 1 (
    call :show_error "Invalid Supabase Anon Key format. Expected JWT token format"
    call :ask_retry "Supabase Anon Key validation" !anon_retry_count!
    goto :anon_retry_loop
)

call :log_message "Supabase Anon Key entered (length: !supabase_anon:~0,-1!.length!)"

:supabase_service_input
set "supabase_service="
set "service_retry_count=0"

:service_retry_loop
set /a service_retry_count+=1
set /p supabase_service="Enter Supabase Service Role Key: "
if "!supabase_service!"=="" (
    call :show_error "Supabase Service Role Key cannot be empty"
    call :ask_retry "Supabase Service Role Key input" !service_retry_count!
    goto :service_retry_loop
)

:: Basic validation for JWT token format
echo !supabase_service! | findstr /r "^[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$" >nul 2>&1
if errorlevel 1 (
    call :show_error "Invalid Supabase Service Role Key format. Expected JWT token format"
    call :ask_retry "Supabase Service Role Key validation" !service_retry_count!
    goto :service_retry_loop
)

call :log_message "Supabase Service Role Key entered (length: !supabase_service:~0,-1!.length!)"

echo.
echo [STEP 2] Security Configuration
echo ========================================
echo.
echo Please provide a secure JWT secret (minimum 32 characters).
echo This will be used to secure your application.
echo.

:jwt_secret_input
set "jwt_secret="
set "jwt_retry_count=0"

:jwt_retry_loop
set /a jwt_retry_count+=1
set /p jwt_secret="Enter JWT Secret (min 32 characters): "

if "!jwt_secret!"=="" (
    call :show_error "JWT Secret cannot be empty"
    call :ask_retry "JWT Secret input" !jwt_retry_count!
    goto :jwt_retry_loop
)

:: Calculate string length more accurately
set "str=!jwt_secret!"
set "len=0"
for /l %%i in (0,1,1000) do if defined str (
    set "str=!str:~1!"
    set /a len+=1
)

if !len! lss 32 (
    call :show_error "JWT Secret must be at least 32 characters (current: !len!)"
    call :ask_retry "JWT Secret validation" !jwt_retry_count!
    goto :jwt_retry_loop
)

call :log_message "JWT Secret entered (length: !len!)"

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

:: Create configuration file with error checking
call :log_message "Creating configuration file..."

:: Test if we can write to the config directory
echo test > config\test.tmp 2>nul
if errorlevel 1 (
    call :show_error "Cannot write to config directory. Please check permissions"
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)
del config\test.tmp >nul 2>&1

:: Create configuration file
(
    echo # Attendance System Deployment Configuration
    echo # Generated on: %date% %time%
    echo # Created by: %USERNAME%
    echo.
    echo # Supabase Configuration
    echo NEXT_PUBLIC_SUPABASE_URL=!supabase_url!
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=!supabase_anon!
    echo SUPABASE_SERVICE_ROLE_KEY=!supabase_service!
    echo.
    echo # Security Configuration
    echo JWT_SECRET=!jwt_secret!
    echo.
    echo # Application Configuration
    echo NEXT_PUBLIC_APP_NAME="!app_name!"
    echo PORT=!app_port!
    echo HOST=0.0.0.0
    echo.
    echo # Network Configuration
    echo CUSTOM_IP=!custom_ip!
    echo.
    echo # Email Configuration
    echo SMTP_HOST=!smtp_host!
    echo SMTP_PORT=!smtp_port!
    echo SMTP_USER=!smtp_user!
    echo SMTP_PASS=!smtp_pass!
    echo EMAIL_FROM=!email_from!
    echo.
    echo # Advanced Configuration
    echo NODE_OPTIONS=!node_options!
    echo LOG_LEVEL=!log_level!
    echo NODE_ENV=production
    echo ENABLE_COMPRESSION=true
    echo ENABLE_CACHING=true
) > config\deployment-config.env

if errorlevel 1 (
    call :show_error "Failed to create configuration file"
    echo [INFO] Check the log file for details: %LOG_FILE%
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)

:: Verify file was created and is readable
if not exist "config\deployment-config.env" (
    call :show_error "Configuration file was not created successfully"
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check file size (should be more than just empty)
for %%A in (config\deployment-config.env) do set "file_size=%%~zA"
if !file_size! lss 100 (
    call :show_error "Configuration file appears to be too small (size: !file_size! bytes)"
    echo [INFO] This might indicate a write error
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)

echo [OK] Configuration saved to config\deployment-config.env
call :log_message "Configuration file created successfully (size: !file_size! bytes)"

:verify_config
echo.
echo ========================================
echo       Configuration Summary
echo ========================================
echo.

:: Check if config file exists and is readable
if not exist "config\deployment-config.env" (
    call :show_error "Configuration file not found"
    echo [INFO] Please run the configuration wizard again
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)

:: Try to read configuration file
set "read_error=0"
for /f "tokens=1,2 delims==" %%a in (config\deployment-config.env) do (
    if not "%%a"=="" if not "%%b"=="" (
        set "key=%%a"
        set "value=%%b"

        :: Skip comments and empty lines
        if "!key:~0,1!" neq "#" (
            if "!key!"=="SMTP_PASS" (
                echo !key!: [HIDDEN]
            ) else if "!key!"=="SUPABASE_SERVICE_ROLE_KEY" (
                echo !key!: !value:~0,20!...
            ) else if "!key!"=="JWT_SECRET" (
                echo !key!: !value:~0,10!...
            ) else (
                echo !key!: !value!
            )
        )
    )
) 2>nul || set "read_error=1"

if !read_error! equ 1 (
    call :show_error "Failed to read configuration file"
    echo [INFO] The file may be corrupted
    echo [INFO] Check the log file for details: %LOG_FILE%
    echo [INFO] Press any key to exit...
    pause >nul
    exit /b 1
)

echo.
:confirm_config
set /p confirm="Is this configuration correct? (y/n): "
if /i "!confirm!"=="y" goto :config_success
if /i "!confirm!"=="n" (
    echo.
    echo [INFO] Configuration not confirmed.
    echo [INFO] You can:
    echo [INFO] 1. Re-run this wizard to create new configuration
    echo [INFO] 2. Edit the file manually: config\deployment-config.env
    echo [INFO] 3. Restore from backup if available
    call :log_message "Configuration not confirmed by user"
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo [WARNING] Please enter 'y' or 'n'.
goto :confirm_config

:config_success
echo.
echo [OK] Configuration verified successfully!
call :log_message "Configuration verified and confirmed by user"

:: Final error check
if !ERROR_COUNT! gtr 0 (
    echo [WARNING] !ERROR_COUNT! error(s) occurred during configuration.
    echo [WARNING] Please check the log file: %LOG_FILE%
    echo.
)

echo You can now run the deployment script:
echo - For local deployment: local-deploy.bat
echo - For full deployment: windows-one-click-deploy.bat
echo.

:: Check for any backup files
for /f "delims=" %%i in ('dir /b config\*.backup.* 2^>nul') do (
    echo [INFO] Backup file available: %%i
)

echo.
echo Press any key to exit...
pause >nul
exit /b 0