// Shared helpers for the Step 8 extended E2E scenarios. Every helper here
// captures the REAL network response of the relevant call (auth, RLS
// select, RPC) rather than inferring success/failure from the DOM alone —
// the DOM often shows the same generic message for a rejected credential
// and for a genuine authorization denial, so the response itself is the
// only reliable signal.
import { chromium } from 'playwright';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export async function newPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  return { browser, page };
}

// Attaches capture for any Supabase auth/rest/rpc response matching
// `urlSubstring`. Returns a function you call after the action to read the
// last matching {status, body}.
export function captureResponse(page, urlSubstring) {
  let status = null;
  let body = null;
  page.on('response', async (res) => {
    if (res.url().includes(urlSubstring)) {
      status = res.status();
      try {
        body = await res.text();
      } catch {
        body = '(could not read body)';
      }
    }
  });
  return () => ({ status, body });
}

export async function loginEmail(page, email, password) {
  const getAuth = captureResponse(page, '/auth/v1/token');
  await page.goto(`${BASE_URL}/staff`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Email")');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  let formGone = false;
  try {
    await page.waitForSelector('#email', { state: 'detached', timeout: 10000 });
    formGone = true;
  } catch {
    formGone = false;
  }
  await page.waitForTimeout(800);
  return { auth: getAuth(), formGone, url: page.url() };
}

export async function loginOperator(page, username, pin) {
  const getAuth = captureResponse(page, '/auth/v1/token');
  await page.goto(`${BASE_URL}/staff`, { waitUntil: 'networkidle' });
  // Operator mode is the default tab, no click needed.
  await page.fill('#username', username);
  await page.fill('#pin', pin);
  await page.click('button[type="submit"]');
  let formGone = false;
  try {
    await page.waitForSelector('#username', { state: 'detached', timeout: 10000 });
    formGone = true;
  } catch {
    formGone = false;
  }
  await page.waitForTimeout(800);
  return { auth: getAuth(), formGone, url: page.url() };
}

// Reads the current session's access token straight out of localStorage
// (the key Supabase JS itself uses: sb-<project-ref>-auth-token). Used to
// make direct, precise REST/RPC calls the app's own UI has no button for
// (e.g. "fetch this exact row by id") while still authenticated as
// whichever staff member just logged in via the real UI.
export async function getAccessToken(page) {
  const raw = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.includes('auth-token'));
    return key ? localStorage.getItem(key) : null;
  });
  if (!raw) return null;
  try {
    return JSON.parse(raw).access_token ?? null;
  } catch {
    return null;
  }
}

const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;

// Direct REST call (PostgREST) as the currently-logged-in user. `path` is
// everything after `/rest/v1/`, e.g. `guest_requests?id=eq.<uuid>`.
export async function restGet(page, path) {
  const token = await getAccessToken(page);
  const res = await page.request.get(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: await res.text() };
}

// Direct RPC call as the currently-logged-in user.
export async function rpc(page, fn, args) {
  const token = await getAccessToken(page);
  const res = await page.request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: args,
  });
  return { status: res.status(), body: await res.text() };
}

// Direct Edge Function invocation as the currently-logged-in user —
// bypasses the UI entirely, needed for precise authorization-matrix
// assertions (a DENY case has no button to click).
export async function callFunction(page, fnName, body) {
  const token = await getAccessToken(page);
  const res = await page.request.post(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  });
  return { status: res.status(), body: await res.text() };
}

export function report(label, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
}
