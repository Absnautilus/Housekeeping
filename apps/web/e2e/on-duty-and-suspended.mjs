// Step 8 extended E2E — items 6, 7.
import { newPage, loginOperator, restGet, captureResponse, report } from './lib.mjs';

const results = [];

// ---------------------------------------------------------------------------
// Item 6 — on_duty toggle
// ---------------------------------------------------------------------------
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginOperator(page, process.env.E2E_OPERATOR_USERNAME, process.env.E2E_OPERATOR_PIN);
  if (!formGone) {
    results.push(report('on_duty toggle', false, `login failed, auth=${auth.status}`));
  } else {
    const before = await restGet(page, `staff_profiles?login_username=eq.${process.env.E2E_OPERATOR_USERNAME}&select=on_duty`);
    const beforeVal = JSON.parse(before.body)[0]?.on_duty;

    const toggleBtn = page.locator('button:has(span.h-2.w-2)');
    await toggleBtn.click();
    await page.waitForTimeout(1000);

    const after = await restGet(page, `staff_profiles?login_username=eq.${process.env.E2E_OPERATOR_USERNAME}&select=on_duty`);
    const afterVal = JSON.parse(after.body)[0]?.on_duty;
    console.log('on_duty before:', beforeVal, 'after one click:', afterVal);
    results.push(report('on_duty toggle cambia stato reale nel DB', beforeVal !== afterVal, `before=${beforeVal} after=${afterVal}`));

    // leave it back where it started, so repeated runs stay consistent
    if (afterVal !== beforeVal) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
    }
  }
  await browser.close();
}

// ---------------------------------------------------------------------------
// Item 7 — staff sospeso (staff_profiles.active = false)
// ---------------------------------------------------------------------------
{
  const { browser, page } = await newPage();
  const getProfileResp = captureResponse(page, '/rest/v1/staff_profiles');
  const { auth, formGone } = await loginOperator(page, process.env.E2E_SUSPENDED_USERNAME, process.env.E2E_SUSPENDED_PIN);
  const profileResp = getProfileResp();
  console.log('suspended-staff auth status:', auth.status, 'formGone:', formGone);
  console.log('suspended-staff profile fetch:', profileResp.status, profileResp.body);

  // The actual security property required: a suspended staff member must
  // NOT end up with a working dashboard session. The network response from
  // the profile self-select IS that ground truth (RLS either returns the
  // row or it doesn't) — the DOM's `formGone` signal is unreliable here:
  // StaffLogin can legitimately unmount-then-remount (loading state, then
  // StaffApp deciding !profile and rendering a FRESH StaffLogin instance
  // with the same #username id), which a one-shot "did #username detach"
  // check can't tell apart from "logged in and stayed logged in". So this
  // check reads profileResp directly rather than trusting formGone.
  let deniedCorrectly = false;
  let mechanism = 'unknown';
  if (auth.status === 200) {
    let rows = [];
    try {
      rows = JSON.parse(profileResp.body ?? '[]');
    } catch {
      rows = null;
    }
    const profileEmpty = profileResp.status === 200 && Array.isArray(rows) && rows.length === 0;
    if (profileEmpty) {
      mechanism = `profile self-select returned empty (RLS denies it while suspended) — formGone was ${formGone} (unreliable signal, see comment)`;
      deniedCorrectly = true;
    } else {
      const bodyText = await page.locator('body').innerText();
      mechanism = `profile fetch did NOT come back empty (status=${profileResp.status} body=${profileResp.body}) — page text: ${bodyText.slice(0, 200)}`;
      deniedCorrectly = false;
    }
  } else {
    mechanism = `auth itself failed (status ${auth.status}) — not the scenario under test`;
  }
  console.log('mechanism observed:', mechanism);
  results.push(report('staff sospeso NON ottiene un accesso funzionante alla dashboard', deniedCorrectly, mechanism));

  await browser.close();
}

console.log('\n=== SUMMARY (on-duty-and-suspended) ===');
const allOk = results.every(Boolean);
console.log(allOk ? 'ALL PASS' : 'SOME FAILED');
if (!allOk) process.exit(1);
