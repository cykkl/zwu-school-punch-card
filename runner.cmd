@echo off
setlocal
chcp 65001 >nul
where node >nul 2>&1
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 18 或更高版本。
  exit /b 1
)
if not exist "%~dp0node_modules\playwright-core\package.json" (
  echo 依赖尚未安装，请先运行 install.cmd。
  exit /b 1
)
node "%~dp0checkin.js" %~1
exit /b %ERRORLEVEL%
