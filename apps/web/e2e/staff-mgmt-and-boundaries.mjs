// Step 8 extended E2E — items 3 (admin side), 5, 9 (admin side).
import { newPage, loginEmail, restGet, BASE_URL, report } from './lib.mjs';

const BAIT_ID = '00000000-0000-0000-0000-0000000baa02';
const HOTEL1_ID = '00000000-0000-0000-0000-000000000001';
const HOTEL2_ID = '00000000-0000-0000-0000-000000000002';

const results = [];
const { browser, page } = await newPage();

const { auth, formGone } = await loginEmail(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
console.log('admin.demo3 auth status:', auth.status);
results.push(report('login property_admin (admin.demo3)', auth.status === 200 && formGone, `auth=${auth.status} formGone=${formGone}`));

if (formGone) {
  // Item 3 (admin side) — property_admin sees ONLY their own hotel's roster,
  // never Hotel Demo 2's.
  const rosterRes = await restGet(page, 'staff_profiles?select=name,hotel_id');
  let roster = [];
  try {
    roster = JSON.parse(rosterRes.body);
  } catch {
    roster = null;
  }
  const scoped = rosterRes.status === 200 && Array.isArray(roster) && roster.length > 0 && roster.every((r) => r.hotel_id === HOTEL1_ID);
  console.log('admin.demo3 roster hotel_ids seen:', roster ? [...new Set(roster.map((r) => r.hotel_id))] : rosterRes.body);
  results.push(report('property_admin vede SOLO il roster del proprio hotel', scoped, `status=${rosterRes.status} rows=${roster?.length}`));

  // Item 9 (admin side) — cross-property denial with a real, valid UUID.
  const baitRes = await restGet(page, `guest_requests?id=eq.${BAIT_ID}&select=id,hotel_id`);
  let baitRows = [];
  try {
    baitRows = JSON.parse(baitRes.body);
  } catch {
    baitRows = null;
  }
  const denied = baitRes.status === 200 && Array.isArray(baitRows) && baitRows.length === 0;
  console.log('admin.demo3 fetch of Hotel Demo 2 bait row:', baitRes.status, baitRes.body);
  results.push(report('property_admin NON accede a una richiesta reale (UUID valido) di Hotel Demo 2', denied, `status=${baitRes.status} rows=${baitRows?.length}`));

  // Item 5 — creazione/disattivazione staff via l'UI reale.
  await page.goto(`${BASE_URL}/staff/admin`, { waitUntil: 'networkidle' });
  const suffix = Date.now().toString().slice(-8);
  const testName = `E2E Temp Staff ${suffix}`;
  const testUsername = `e2etemp${suffix}`;
  await page.fill('#name', testName);
  await page.fill('#username', testUsername);
  await page.fill('#pin', '135790');
  await page.click('button[type="submit"]');

  let created = false;
  try {
    await page.waitForSelector(`text=${testName}`, { timeout: 10000 });
    created = true;
  } catch {
    created = false;
  }
  console.log('staff creation via UI:', created ? 'row appeared' : 'row never appeared');

  let createdActive = null;
  if (created) {
    const checkRes = await restGet(page, `staff_profiles?login_username=eq.${testUsername}&select=id,active`);
    try {
      const rows = JSON.parse(checkRes.body);
      createdActive = rows[0]?.active ?? null;
    } catch {
      createdActive = null;
    }
  }
  results.push(report('creazione staff (operatore) via Edge Function reale', created && createdActive === true, `row_appeared=${created} active=${createdActive}`));

  // Deactivate it: find the row, click its toggle, confirm the dialog.
  let deactivated = false;
  if (created) {
    const row = page.locator('tr', { hasText: testName });
    await row.locator('button').click();
    // confirm dialog
    try {
      await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
      await page.locator('.fixed.inset-0 button').last().click();
    } catch {
      // no dialog appeared — fall through, the check below will catch it
    }
    await page.waitForTimeout(1000);
    const checkRes2 = await restGet(page, `staff_profiles?login_username=eq.${testUsername}&select=id,active`);
    try {
      const rows2 = JSON.parse(checkRes2.body);
      deactivated = rows2[0]?.active === false;
    } catch {
      deactivated = false;
    }
  }
  results.push(report('disattivazione staff via UI reale', deactivated, `deactivated=${deactivated}`));
} else {
  for (const label of [
    'property_admin vede SOLO il roster del proprio hotel',
    'property_admin NON accede a una richiesta reale (UUID valido) di Hotel Demo 2',
    'creazione staff (operatore) via Edge Function reale',
    'disattivazione staff via UI reale',
  ]) {
    results.push(report(label, false, 'skipped, login failed'));
  }
}

await browser.close();

console.log('\n=== SUMMARY (staff-mgmt-and-boundaries) ===');
const allOk = results.every(Boolean);
console.log(allOk ? 'ALL PASS' : 'SOME FAILED');
if (!allOk) process.exit(1);
