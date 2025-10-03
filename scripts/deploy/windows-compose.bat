@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Windows One-Click Deploy (Docker Compose)
REM Launches the PowerShell orchestrator

set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%windows-compose.ps1" %*

endlocal
