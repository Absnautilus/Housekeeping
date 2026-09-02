// Fase 2 Step 8 — E2E smoke test: guest login (room + PIN), create a
// request, see it in the status list, cancel it. Runs against a locally
// started `vite` preview of this app — never against production.
import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const room = process.env.E2E_ROOM ?? '304';
const pin = process.env.E2E_GUEST_PIN;

if (!pin) {
  console.error('Missing E2E_GUEST_PIN env var');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(name) {
  await page.screenshot({ path: `e2e-results/guest-${name}.png`, fullPage: true });
}

// 1. Guest login (room + PIN)
await page.goto(`${baseUrl}/g`, { waitUntil: 'networkidle' });
await page.fill('#roomNumber', room);
await page.fill('#pin', pin);
await page.click('button[type="submit"]');

const categorySelector = 'div.grid.grid-cols-2.gap-3 button';
let loginOk = false;
try {
  await page.waitForSelector(categorySelector, { timeout: 10000 });
  loginOk = true;
} catch {
  loginOk = false;
}
await shot('01-after-login');
console.log('Guest login:', loginOk ? 'PASS' : 'FAIL - category grid never appeared');
if (!loginOk) {
  await browser.close();
  process.exit(1);
}

// 2. Create a request: first category -> first type -> send
await page.locator(categorySelector).first().click();
await page.waitForSelector('div.space-y-2 button', { timeout: 8000 });
await page.locator('div.space-y-2 button').first().click();
await page.waitForTimeout(500); // compose form render
await shot('02-compose');
await page.locator('button').last().click(); // the compose form's Send button is the last on the page

const statusCardSelector = 'div.space-y-3 button';
let createOk = false;
try {
  await page.waitForSelector(statusCardSelector, { timeout: 10000 });
  createOk = true;
} catch {
  createOk = false;
}
await shot('03-after-create');
console.log('Create request:', createOk ? 'PASS' : 'FAIL - no request card appeared in status list');

// 3. Cancel it
let cancelOk = false;
if (createOk) {
  await page.locator(statusCardSelector).first().click();
  try {
    await page.waitForSelector(statusCardSelector, { state: 'detached', timeout: 8000 });
    cancelOk = true;
  } catch {
    cancelOk = false;
  }
}
await shot('04-after-cancel');
console.log('Cancel request:', cancelOk ? 'PASS' : 'FAIL - cancel button never disappeared');

await browser.close();

const allOk = loginOk && createOk && cancelOk;
console.log('RESULT:', allOk ? 'PASS - full guest flow succeeded' : 'FAIL - see steps above');
if (!allOk) process.exit(1);
