@echo off
call "%~dp0runner.cmd" dry-run
set "EXIT_CODE=%ERRORLEVEL%"
pause
exit /b %EXIT_CODE%
