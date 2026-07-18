@echo off
setlocal
chcp 65001 >nul
where node >nul 2>&1
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 18 或更高版本。
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo 未检测到 npm，请重新安装完整版 Node.js。
  pause
  exit /b 1
)
pushd "%~dp0"
call npm install
set "EXIT_CODE=%ERRORLEVEL%"
popd
if not "%EXIT_CODE%"=="0" echo 依赖安装失败。
if "%EXIT_CODE%"=="0" echo 依赖安装完成。
pause
exit /b %EXIT_CODE%
