param(
  [ValidatePattern('^(?:[01]\d|2[0-3]):[0-5]\d$')]
  [string]$Time = '20:00'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($identity -match '\\CodexSandboxOffline$') {
  throw '请在自己的 Windows 桌面中双击 first-run.cmd，不要从 Codex 临时终端运行。'
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw '未检测到 Node.js。请先从 https://nodejs.org/ 安装 Node.js 18 或更高版本。'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw '未检测到 npm，请重新安装完整版 Node.js。'
}

Write-Host 'WPS 留校每日打卡 - 首次配置' -ForegroundColor Cyan
Write-Host '除姓名和表单链接外，其余参数已按同一表单预设。'

if (Test-Path -LiteralPath (Join-Path $root 'config.json')) {
  $overwrite = (Read-Host 'config.json 已存在，是否重新配置？输入 Y 继续').Trim()
  if ($overwrite -notmatch '^(?i)y(?:es)?$') {
    Write-Host '已取消，原配置未修改。'
    exit 0
  }
}

do {
  $personName = (Read-Host '请输入姓名（必须与 WPS 姓名名单完全一致）').Trim()
} while (-not $personName)

do {
  $formUrl = (Read-Host '请粘贴扫码后浏览器地址栏中的 WPS 表单完整链接').Trim()
  if ($formUrl -notmatch '^https://f\.wps\.cn/') {
    Write-Host '链接应以 https://f.wps.cn/ 开头，请重新输入。' -ForegroundColor Yellow
    $formUrl = ''
  }
} while (-not $formUrl)

$config = [ordered]@{
  personName = $personName
  requiredLocation = '浙江省宁波市'
  formUrl = $formUrl
  formTitle = '26信智暑假留校每日打卡'
  dormOption = '在寝'
  edgePath = ''
  cdpPort = 9227
}
$configJson = $config | ConvertTo-Json
[IO.File]::WriteAllText(
  (Join-Path $root 'config.json'),
  $configJson,
  [Text.UTF8Encoding]::new($false)
)
Write-Host '私人配置已保存到 config.json。' -ForegroundColor Green

if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules\playwright-core\package.json'))) {
  Write-Host '正在安装依赖，请保持联网……'
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw '依赖安装失败，请检查网络后重试。' }
}

Write-Host ''
Write-Host '下一步会打开专用 Edge：' -ForegroundColor Cyan
Write-Host '1. 登录 WPS；'
Write-Host '2. 在表单内手动点击定位按钮；'
Write-Host '3. 位置权限提示选择“允许”；'
Write-Host '4. 必须看到“浙江省宁波市”；'
Write-Host '5. 成功后关闭整个专用 Edge 窗口。'
Read-Host '准备好后按 Enter 打开 Edge'

& node.exe (Join-Path $root 'checkin.js') setup
if ($LASTEXITCODE -ne 0) { throw 'WPS 登录或定位设置未完成。' }

Write-Host '开始无提交测试：只填写和截图，不会提交。' -ForegroundColor Cyan
& node.exe (Join-Path $root 'checkin.js') dry-run
if ($LASTEXITCODE -ne 0) {
  throw '无提交测试失败，尚未创建计划任务。请查看 logs\checkin.log 和失败截图。'
}

& (Join-Path $root 'install-task.ps1') -Time $Time
Write-Host ''
Write-Host "首次配置完成：$personName，每天 $Time 自动运行。" -ForegroundColor Green
Write-Host '今天如需正式提交，可在本人真实在场时双击 run.cmd。'