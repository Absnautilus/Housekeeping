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
let profileStatus = null;
let profileBody = null;
page.on('response', async (res) => {
  if (res.url().includes('/auth/v1/token')) {
    authRequestSeen = true;
    authStatus = res.status();
  }
  if (res.url().includes('/rest/v1/staff_profiles')) {
    profileStatus = res.status();
    try {
      profileBody = await res.text();
    } catch {
      profileBody = '(could not read body)';
    }
  }
});

// /staff/login isn't a distinct route — StaffApp (mounted for /staff/*)
// renders <StaffLogin/> in place whenever there's no profile yet, on
// whatever sub-path you happened to land on. So the URL never changes on
// a successful login; the login *form* unmounting is the real signal.
// Navigating to /staff itself (not /staff/login) also means a successful
// login lands on the path StaffApp's own "/" child route expects.
await page.goto(`${baseUrl}/staff`, { waitUntil: 'networkidle' });
await page.click('button:has-text("Email")');
await page.fill('#email', email);
await page.fill('#password', password);
await page.click('button[type="submit"]');

let loggedIn = false;
try {
  await page.waitForSelector('#email', { state: 'detached', timeout: 10000 });
  loggedIn = true;
} catch {
  loggedIn = false;
}
await page.waitForTimeout(500);

await page.screenshot({ path: 'e2e-results/admin-login.png', fullPage: true });

console.log('Auth request reached the server:', authRequestSeen, 'status:', authStatus);
console.log('staff_profiles request status:', profileStatus, 'body:', profileBody);
console.log('URL after login:', page.url());
console.log('RESULT:', loggedIn ? 'PASS - admin login succeeded (login form unmounted)' : 'FAIL - login form still present after 10s');

await browser.close();

if (!authRequestSeen) {
  console.error('The /auth/v1/token request never got a response — this is a network reachability problem, not a credentials problem.');
  process.exit(2);
}
if (!loggedIn) {
  process.exit(1);
}
