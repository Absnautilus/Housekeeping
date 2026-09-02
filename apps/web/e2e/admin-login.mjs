// Fase 2 Step 8 — E2E smoke test: staff email/password login against the
// real shared Supabase project. Runs against a locally-started `vite`
// preview of this app (see the e2e-smoke workflow) — never against
// production. Credentials come from env vars, never hardcoded.
import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Missing E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

let authRequestSeen = false;
let authStatus = null;
page.on('response', (res) => {
  if (res.url().includes('/auth/v1/token')) {
    authRequestSeen = true;
    authStatus = res.status();
  }
});

await page.goto(`${baseUrl}/staff/login`, { waitUntil: 'networkidle' });
await page.click('button:has-text("Email")');
await page.fill('#email', email);
await page.fill('#password', password);
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

await page.screenshot({ path: 'e2e-results/admin-login.png', fullPage: true });

const url = page.url();
const loggedIn = url.includes('/staff') && !url.includes('/staff/login');

console.log('Auth request reached the server:', authRequestSeen, 'status:', authStatus);
console.log('URL after login:', url);
console.log('RESULT:', loggedIn ? 'PASS - admin login succeeded' : 'FAIL - still on login screen');

await browser.close();

if (!authRequestSeen) {
  console.error('The /auth/v1/token request never got a response — this is a network reachability problem, not a credentials problem.');
  process.exit(2);
}
if (!loggedIn) {
  process.exit(1);
}
