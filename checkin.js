const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] || 'dry-run';
const ROOT = __dirname;
const CONFIG_FILE = path.join(ROOT, 'config.json');
const PROFILE_DIR = path.join(ROOT, 'edge-profile');
const LOG_DIR = path.join(ROOT, 'logs');
const STATE_FILE = path.join(ROOT, 'state.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const CONFIG = readConfig();
const PERSON_NAME = String(CONFIG.personName || '').trim();
const REQUIRED_LOCATION = String(CONFIG.requiredLocation || '').trim();
const FORM_URL = String(CONFIG.formUrl || '').trim();
const FORM_TITLE = String(CONFIG.formTitle || '').trim();
const DORM_OPTION = String(CONFIG.dormOption || '').trim();
const CDP_PORT = Number(CONFIG.cdpPort || 9227);
const EDGE_PATH = String(CONFIG.edgePath || '').trim() || [
  process.env['ProgramFiles(x86)'],
  process.env.ProgramFiles,
  process.env.LOCALAPPDATA,
].filter(Boolean)
  .map((base) => path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
  .find((candidate) => fs.existsSync(candidate)) || '';

fs.mkdirSync(PROFILE_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

function validateConfig() {
  const errors = [];
  if (!fs.existsSync(CONFIG_FILE)) errors.push('缺少 config.json，请复制 config.example.json 后填写');
  if (!PERSON_NAME) errors.push('personName 不能为空');
  if (!REQUIRED_LOCATION) errors.push('requiredLocation 不能为空');
  if (!/^https:\/\/f\.wps\.cn\//.test(FORM_URL)) errors.push('formUrl 必须是有效的 WPS 表单地址');
  if (!FORM_TITLE) errors.push('formTitle 不能为空');
  if (!DORM_OPTION) errors.push('dormOption 不能为空');
  if (!Number.isInteger(CDP_PORT) || CDP_PORT < 1024 || CDP_PORT > 65535) {
    errors.push('cdpPort 必须是 1024 到 65535 之间的整数');
  }
  if (!EDGE_PATH || !fs.existsSync(EDGE_PATH)) errors.push('未找到 Microsoft Edge，请在 config.json 中设置 edgePath');
  if (errors.length > 0) throw new Error(`配置错误：${errors.join('；')}`);
}

function nowShanghai() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

function todayShanghai() {
  return nowShanghai().slice(0, 10);
}

function stamp() {
  return nowShanghai().replace(/[-: ]/g, '');
}

function log(message) {
  const line = `[${nowShanghai()}] ${message}`;
  console.log(line);
  fs.appendFileSync(path.join(LOG_DIR, 'checkin.log'), `${line}\n`, 'utf8');
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function saveScreenshot(page, label) {
  const target = path.join(LOG_DIR, `${stamp()}-${label}.png`);
  await page.screenshot({ path: target, fullPage: true });
  log(`已保存截图：${target}`);
  return target;
}

async function waitForEdge() {
  const endpoint = `http://127.0.0.1:${CDP_PORT}`;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return endpoint;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Edge启动超时，请关闭自动打卡专用的Edge窗口后重试');
}

async function openEdge() {
  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--disable-first-run-ui',
    '--disable-session-crashed-bubble',
    '--start-maximized',
    FORM_URL,
  ], { stdio: 'ignore', windowsHide: false });

  const browser = await chromium.connectOverCDP(await waitForEdge());
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find((item) => item.url().includes('f.wps.cn')) || pages[0] || await context.newPage();
  return { browser, page, edgeProcess };
}

async function waitForForm(page) {
  await page.goto(FORM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText(FORM_TITLE, { exact: true }).waitFor({ timeout: 60000 });
  const text = await page.locator('body').innerText();
  if (text.includes('此表单需要登录才能填写')) {
    throw new Error('WPS登录已失效，请运行 setup.cmd 重新登录');
  }
}

async function dismissDraftPrompt(page) {
  const cancel = page.getByRole('button', { name: '取 消', exact: true });
  const count = await cancel.count();
  for (let index = 0; index < count; index += 1) {
    const item = cancel.nth(index);
    if (await item.isVisible()) {
      await item.click();
      await page.waitForTimeout(500);
      return;
    }
  }
}

async function nameIsCorrect(page) {
  return await page.evaluate((name) =>
    [...document.querySelectorAll('textarea:disabled')]
      .some((item) => item.value.trim() === name), PERSON_NAME);
}

async function waitForPageReady(page, trigger) {
  await trigger.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    return ![...document.querySelectorAll('.ksapc-loading-content, .ant-spin-spinning')]
      .some(isVisible);
  }, null, { timeout: 60000 });
}

async function openNameDropdown(page, trigger) {
  const popover = page.locator('.ant-popover-inner:visible');

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await dismissDraftPrompt(page);
    await waitForPageReady(page, trigger);
    await trigger.scrollIntoViewIfNeeded();

    const box = await trigger.boundingBox();
    if (!box) throw new Error('姓名下拉框当前不可见');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    try {
      await popover.waitFor({ state: 'visible', timeout: 10000 });
      return;
    } catch {
      log(`姓名下拉框第${attempt}次未弹出，准备重试`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }
  }

  throw new Error('连续3次点击后，姓名名单仍未弹出');
}

async function selectPerson(page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await dismissDraftPrompt(page);
    if (await nameIsCorrect(page)) return;

    const trigger = page.locator('.ksapc-q-associated-data-search-select-trigger-default');
    if (await trigger.count() !== 1) throw new Error('未找到唯一的姓名下拉框');
    await openNameDropdown(page, trigger);

    const option = page.locator(
      `.ksapc-q-associated-data-search-select-main-list-item[title="${PERSON_NAME}"]`
    );
    try {
      await option.waitFor({ state: 'attached', timeout: 45000 });
      if (await option.count() !== 1) throw new Error(`姓名列表中的“${PERSON_NAME}”不是唯一项`);
      await option.click({ force: true });
      await page.waitForFunction(
        (name) => [...document.querySelectorAll('textarea:disabled')]
          .some((item) => item.value.trim() === name),
        PERSON_NAME,
        { timeout: 20000 }
      );
      return;
    } catch (error) {
      if (attempt === 3) throw new Error(`姓名选择连续3次失败：${error.message}`);
      log(`姓名选择第${attempt}次失败，重新加载表单`);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByText(FORM_TITLE, { exact: true }).waitFor({ timeout: 60000 });
    }
  }
}

async function selectDormOptions(page) {
  const options = page.getByText(DORM_OPTION, { exact: true });
  if (await options.count() < 2) throw new Error(`未找到两项“${DORM_OPTION}”选项`);
  await options.nth(0).click();
  await options.nth(1).click();
  if (await page.locator('input[type="radio"]:checked').count() < 2) {
    throw new Error(`两项“${DORM_OPTION}”没有同时选中`);
  }
}

async function refreshLocation(page) {
  let button = page.getByText('重新定位', { exact: true });
  if (await button.count() !== 1) {
    button = page.getByText('点击自动定位 (省/市)', { exact: true });
  }
  if (await button.count() !== 1) {
    button = page.getByText('点击自动定位', { exact: false });
  }
  if (await button.count() !== 1) throw new Error('未找到唯一的定位按钮');

  await button.click();
  try {
    await page.waitForFunction(
      (location) => document.body.innerText.includes(location),
      REQUIRED_LOCATION,
      { timeout: 30000 }
    );
  } catch {
    throw new Error(`真实定位未显示“${REQUIRED_LOCATION}”`);
  }
}

async function prepareForm(page) {
  await waitForForm(page);
  await selectPerson(page);
  if (!await nameIsCorrect(page)) throw new Error(`姓名校验不是“${PERSON_NAME}”`);
  await selectDormOptions(page);
  await refreshLocation(page);
}

async function submitForm(page) {
  const beforeText = await page.locator('body').innerText();
  const countMatch = beforeText.match(/已填过\s*(\d+)\s*次/);
  const previousCount = countMatch ? Number(countMatch[1]) : null;

  const submit = page.getByRole('button', { name: '提 交', exact: true });
  if (await submit.count() !== 1) throw new Error('未找到唯一的提交按钮');
  await submit.click();

  await page.waitForFunction(
    ({ previous }) => {
      const text = document.body.innerText;
      if (text.includes('提交成功')) return true;
      const match = text.match(/已填过\s*(\d+)\s*次/);
      return match && previous !== null && Number(match[1]) > previous;
    },
    { previous: previousCount },
    { timeout: 30000 }
  );
}

async function main() {
  if (!['setup', 'dry-run', 'run'].includes(MODE)) throw new Error(`未知模式：${MODE}`);
  validateConfig();
  if (MODE === 'run' && readState().lastSuccessDate === todayShanghai()) {
    log('今天已经成功提交过，跳过重复运行');
    return;
  }

  const { browser, page, edgeProcess } = await openEdge();
  try {
    if (MODE === 'setup') {
      await page.goto(FORM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      log('请登录WPS并允许真实定位，完成后关闭整个Edge窗口');
      await new Promise((resolve) => browser.on('disconnected', resolve));
      return;
    }

    await prepareForm(page);
    if (MODE === 'dry-run') {
      await saveScreenshot(page, 'dry-run-ready');
      log(`无提交测试通过：${PERSON_NAME}、两项${DORM_OPTION}、${REQUIRED_LOCATION}；未点击提交`);
      return;
    }

    await submitForm(page);
    const screenshot = await saveScreenshot(page, 'success');
    writeState({
      lastSuccessDate: todayShanghai(),
      lastSuccessTime: nowShanghai(),
      screenshot,
    });
    log('今日打卡提交成功');
  } catch (error) {
    log(`运行失败：${error.message}`);
    try { await saveScreenshot(page, 'failed'); } catch {}
    process.exitCode = 1;
  } finally {
    if (MODE !== 'setup') {
      try { await browser.close(); } catch {}
      try { edgeProcess.kill(); } catch {}
    }
  }
}

main().catch((error) => {
  log(`启动失败：${error.message}`);
  process.exitCode = 1;
});
