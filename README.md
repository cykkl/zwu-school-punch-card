# WPS 留校每日打卡

通过本机 Microsoft Edge 自动打开 WPS 表单，选择本人信息、填写住宿状态、读取真实定位并提交。

> 仅适用于本人真实在场、且学校允许自动化填写的场景。程序使用真实浏览器定位，不会伪造位置。请勿代替他人打卡。

## 适用范围

本项目按一种特定的 WPS 表单结构编写，要求表单中包含：

- 可搜索的姓名下拉框，选择后自动带出个人信息；
- 两项住宿状态单选题，例如“今晚”和“明晚预计”；
- 一个省市定位题；
- WPS 的提交按钮及可能出现的二次确认弹窗。

如果你的表单字段、选项文字或页面结构不同，程序可能无法直接使用，需要调整 `checkin.js`。

## 准备工作

- Windows 10 或 Windows 11；
- Microsoft Edge；
- [Node.js](https://nodejs.org/) 18 或更高版本；
- 自己有权填写的 WPS 表单链接；
- 电脑执行时保持开机、联网，并登录到自己的 Windows 桌面账户。

安装 Node.js 时使用默认选项即可。安装完成后可打开终端运行 `node --version`，能显示版本号即表示安装成功。

## 推荐：一键首次配置

1. 在 GitHub 仓库页面点击 **Code → Download ZIP**，下载后完整解压；
2. 双击 `first-run.cmd`；
3. 按提示输入姓名，并粘贴同一个 WPS 表单链接；
4. 脚本会自动生成私人配置并安装依赖；
5. Edge 打开后登录 WPS，在表单中手动点击定位并选择“允许”；
6. 确认显示“浙江省宁波市”后关闭整个专用 Edge 窗口；
7. 脚本会自动执行无提交测试；测试通过后自动创建每天 20:00 的计划任务。

除姓名和 WPS 链接外，脚本已预设表单标题“26信智暑假留校每日打卡”、真实定位“浙江省宁波市”、住宿选项“在寝”、Edge 调试端口和执行时间。WPS 链接不写入公开仓库，避免表单内其他同学的信息被公开暴露。

如果无提交测试失败，脚本不会创建计划任务。请根据窗口提示和 `logs` 中的记录排查。

## 手动配置（可选）

### 1. 下载项目

在 GitHub 仓库页面点击 **Code → Download ZIP**，下载后完整解压到一个固定文件夹。不要直接在 ZIP 压缩包内运行脚本。

也可以使用 Git：

~~~powershell
git clone https://github.com/cykkl/zwu-school-punch-card.git
~~~

### 2. 安装依赖

双击 `install.cmd`。看到“依赖安装完成”后关闭窗口。

### 3. 创建私人配置

复制 `config.example.json`，将副本重命名为 `config.json`。使用记事本编辑：

~~~json
{
  "personName": "你的姓名",
  "requiredLocation": "浙江省宁波市",
  "formUrl": "https://f.wps.cn/你的表单地址",
  "formTitle": "26信智暑假留校每日打卡",
  "dormOption": "在寝",
  "edgePath": "",
  "cdpPort": 9227
}
~~~

各字段含义：

- `personName`：姓名下拉列表中显示的完整姓名，必须完全一致；
- `requiredLocation`：点击定位后页面显示的省市文字，例如“某省某市”；
- `formUrl`：扫描二维码后，在浏览器地址栏复制的 WPS 表单完整地址；
- `formTitle`：表单页面顶部显示的完整标题；
- `dormOption`：需要选择的住宿状态文字，例如“在寝”；
- `edgePath`：通常留空，程序会自动寻找 Edge；
- `cdpPort`：通常保留 `9227`，仅在端口冲突时修改。

`config.json` 包含私人信息，已经被 `.gitignore` 排除，不要上传到公开仓库。

### 4. 登录 WPS 并允许定位

1. 打开 Windows“设置 → 隐私和安全性 → 位置”，开启“位置服务”“允许应用访问你的位置”和“允许桌面应用访问你的位置”；
2. 在 Edge 打开 `edge://settings/content/location`，开启“访问前询问”，并从阻止列表中移除 WPS；
3. 关闭之前由本项目打开的专用 Edge 窗口；
4. 双击 `setup.cmd`；
5. 在自动打开的 Edge 中登录 WPS；
6. 在表单中手动点击“重新定位”或“点击自动定位”；
7. 浏览器询问位置权限时选择“允许”；
8. 必须确认表单显示 `requiredLocation` 中填写的真实省市；
9. 成功后关闭整个专用 Edge 窗口。

登录状态和定位权限会保存在本地 `edge-profile` 文件夹中，不会上传到 GitHub。

### 5. 进行无提交测试

双击 `dry-run.cmd`。程序会填写姓名、两项住宿状态和真实定位，并在 `logs` 文件夹保存截图，但不会点击提交。

看到“无提交测试通过”后，先检查截图中的姓名、选项和定位是否正确。任何一项不正确都不要继续安装自动任务。

### 6. 可选：手动测试一次正式提交

只有在本人真实在场且确认所有信息正确时，才双击 `run.cmd`。这一步会真实提交表单，并自动点击“提交后不可修改”的二次确认。

成功后会生成 `state.json`，防止当天重复提交；成功截图和日志保存在 `logs`。

### 7. 安装每天自动运行的计划任务

在项目文件夹空白处右键，选择“在终端中打开”或“在 PowerShell 中打开”，运行：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Time "20:00"
~~~

将 `20:00` 改成需要的 24 小时时间。请务必在自己的 Windows 桌面账户中运行，不要从 Codex 的临时终端安装。

任务允许电池运行，错过时间后会补跑，失败后会在 3 分钟后重试一次。系统支持时会尝试唤醒电脑，但自动填写仍需要自己的 Windows 会话可用。

## 验证计划任务

在 PowerShell 中运行：

~~~powershell
Get-ScheduledTask -TaskName "WPS留校每日打卡"
~~~

看到任务且 `State` 不是 `Disabled`，说明任务已创建。也可以打开“任务计划程序”，在“任务计划程序库”中查看同名任务。

需要立即测试计划任务时运行：

~~~powershell
Start-ScheduledTask -TaskName "WPS留校每日打卡"
~~~

这会执行正式提交，请只在本人真实在场并确认配置正确时使用。

## 修改时间或卸载

重新运行安装命令即可更新执行时间：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Time "21:30"
~~~

删除计划任务：

~~~powershell
Unregister-ScheduledTask -TaskName "WPS留校每日打卡" -Confirm:$false
~~~

## 常见问题

### 提示 WPS 登录失效

重新运行 `setup.cmd`，登录 WPS 后关闭整个专用 Edge 窗口。

### 定位失败或城市不正确

依次检查：

1. Windows“设置 → 隐私和安全性 → 位置”中的三个位置开关；
2. Edge 的 `edge://settings/content/location` 是否开启“访问前询问”，WPS 是否在阻止列表；
3. 重新运行 `setup.cmd`，在表单内手动点击定位并选择“允许”；
4. 暂时关闭 VPN 后重试，避免网络位置服务受干扰；
5. `requiredLocation` 是否与页面实际显示的省市完全一致。

如果曾经点过“阻止”，只重跑程序不会自动恢复权限，必须先在 Edge 设置中删除 WPS 的阻止记录。程序只读取 Windows/Edge 提供的真实位置，不会设置或伪造坐标。

### 姓名下拉框打不开或找不到姓名

先在浏览器中手动确认姓名存在于表单名单，并检查 `personName` 是否完全一致。表单页面结构改变时可能需要更新程序。

### Edge 启动超时

关闭由本项目打开的所有专用 Edge 窗口后重试，并确认没有其他程序占用 `cdpPort`。

### 到时间没有运行

确认电脑开机联网、任务未禁用，并检查 `logs/checkin.log`。如果任务不存在，请在自己的 Windows 桌面账户中重新运行安装命令。

### 提交后卡在确认弹窗

请更新到仓库最新版本。最新版会自动点击 WPS 的二次确认按钮。

## 文件说明

- `first-run.cmd` / `first-run.ps1`：推荐的一键首次配置向导；
- `checkin.js`：主程序；
- `config.example.json`：可公开的配置模板；
- `config.json`：本地私人配置，不会被 Git 提交；
- `install.cmd`：安装 Node.js 依赖；
- `setup.cmd`：登录 WPS 和设置定位权限；
- `dry-run.cmd`：完整填写并截图，但不提交；
- `run.cmd`：正式提交入口；
- `install-task.ps1`：创建或更新 Windows 计划任务；
- `edge-profile/`：专用 Edge 登录资料；
- `logs/`：运行日志和截图；
- `state.json`：记录当天是否已经成功提交。

## 隐私与安全

`config.json`、`edge-profile/`、`logs/` 和 `state.json` 均已加入 `.gitignore`。不要强制提交这些内容，也不要上传姓名、学号、Cookie、登录资料或打卡截图。

首次使用和表单发生变化后，都应先运行 `dry-run.cmd` 检查。自动化不能替代本人确认真实住宿状态，也不能保证在 WPS 页面改版后继续工作。