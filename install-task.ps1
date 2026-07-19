param(
  [ValidatePattern('^(?:[01]\d|2[0-3]):[0-5]\d$')]
  [string]$Time = '20:00',
  [string]$TaskName = 'WPS留校每日打卡'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runScript = Join-Path $root 'run.cmd'
if (-not (Test-Path -LiteralPath $runScript)) { throw "未找到 $runScript" }
$arguments = '/d /c ""{0}""' -f $runScript
$action = New-ScheduledTaskAction -Execute $env:ComSpec -Argument $arguments -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($identity -match '\\CodexSandboxOffline$') {
  throw '当前是 Codex 临时账户。请在自己的 Windows 桌面中打开 PowerShell，再运行此安装脚本。'
}
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -WakeToRun `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 1 `
  -RestartInterval (New-TimeSpan -Minutes 3) `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask `
  -TaskName $TaskName `
  -Description "每天 $Time 运行WPS留校打卡脚本" `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null
Write-Host "计划任务已创建：用户 $identity，每天 $Time 运行；允许电池运行并在错过时间后补跑，失败后 3 分钟重试 1 次。"
