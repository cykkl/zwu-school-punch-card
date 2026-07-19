@echo off
setlocal
chcp 65001 >nul
title WPS first-time setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0first-run.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" echo Setup failed. See the message above.
if "%EXIT_CODE%"=="0" echo Setup completed.
pause
exit /b %EXIT_CODE%