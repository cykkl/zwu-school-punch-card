@echo off
call "%~dp0runner.cmd" run
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" powershell.exe -NoProfile -WindowStyle Hidden -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('自动打卡失败，请立即手动完成。详细记录在 %~dp0logs。','WPS留校打卡')"
exit /b %EXIT_CODE%
