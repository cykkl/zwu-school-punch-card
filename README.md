# WPS 留校每日打卡

通过 CDP 控制本机 Microsoft Edge，在 WPS 表单中选择本人信息、填写住宿状态、读取真实定位并提交。仅适用于本人真实在场、且所在学校允许自动化填写的场景。

## 环境要求

- Windows 10 或 Windows 11
- Microsoft Edge
- Node.js 18 或更高版本

## 安装

1. 下载或克隆本仓库。
2. 双击 install.cmd 安装项目依赖。
3. 将 config.example.json 复制为 config.json。
4. 在 config.json 中填写姓名、真实定位要求、表单地址、表单标题和住宿选项。
5. 双击 setup.cmd，登录 WPS 并允许定位，然后关闭自动打开的整个 Edge 窗口。
6. 双击 dry-run.cmd 进行一次完整测试。测试只填写和截图，不会提交。
7. 测试成功后，在 PowerShell 中运行：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Time "20:00"
~~~

Time 可按需要改为其他 24 小时时间。计划任务失败后会在 3 分钟后重试 1 次。

## 配置

~~~json
{
  "personName": "你的姓名",
  "requiredLocation": "定位页面应显示的省市",
  "formUrl": "你的 WPS 表单地址",
  "formTitle": "表单页面显示的完整标题",
  "dormOption": "需要选择的住宿选项",
  "edgePath": "",
  "cdpPort": 9227
}
~~~

edgePath 通常可以留空，程序会自动寻找 Edge。找不到时再填写 msedge.exe 的完整路径。

## 文件说明

- checkin.js：主程序。
- config.example.json：可公开的配置模板。
- config.json：本地私人配置，不会被 Git 提交。
- install.cmd：安装依赖。
- setup.cmd：登录 WPS 和设置定位权限。
- dry-run.cmd：完整填写并截图，但不提交。
- run.cmd：正式提交入口。
- install-task.ps1：创建指定时间运行的计划任务。
- edge-profile/：自动化专用 Edge 登录资料。
- logs/：运行日志和截图。
- state.json：记录当天是否已经提交，防止重复运行。

## 隐私和安全

config.json、edge-profile/、logs/ 和 state.json 均已加入 .gitignore。不要强制提交这些内容，也不要把包含姓名、学号、Cookie 或打卡截图的文件上传到公开仓库。

电脑必须在执行时间保持开机、联网且未锁屏。WPS 表单页面发生变化时，页面选择器可能需要更新。
