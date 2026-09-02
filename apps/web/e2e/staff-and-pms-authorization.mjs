// Step 9 pre-cutover gate — permanent regression coverage for
// create-staff-account and sync-pms-stays after their authorization was
// moved off staff_profiles.role onto guest_requests_staff_manage_allowed()/
// has_permission('guest_requests.pms.manage'). Calls both Edge Functions
// directly (callFunction), not through the UI, so DENY cases (which have
// no button to click) are exercised precisely.
//
// The two cross-organization boundary cases (master targeting Hotel Demo
// 3, which belongs to a wholly separate organization/admin -- see
// fixtures/third-org-hotel.sql) are real PASS/FAIL assertions, not SKIPs:
// master has org-wide reach on Hotel Demo's and Hotel Demo 2's
// organizations only (one membership per org that existed when
// backfill_staff_identity() ran), never on Hotel Demo 3's -- this is what
// actually isolates "org-wide reach" from "no boundary at all" that the
// first two existing hotels couldn't. Both cases log in as E2E_MASTER (no
// new credentials needed -- they assert master is DENIED, not that Admin
// B's own account works) but do need Hotel Demo 3 to already exist (run
// fixtures/third-org-hotel.sql first) -- until then these two report as
// normal FAILs, not a skip, per Step 9's explicit instruction.
import { newPage, loginEmail, loginOperator, callFunction, report } from './lib.mjs';

const HOTEL1_ID = '00000000-0000-0000-0000-000000000001';
const HOTEL2_ID = '00000000-0000-0000-0000-000000000002';
const HOTEL3_ID = '00000000-0000-0000-0000-000000000003';

const results = [];

// ---------------------------------------------------------------------------
// create-staff-account
// ---------------------------------------------------------------------------

// property_admin + propria property -> ALLOW
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
  if (auth.status === 200 && formGone) {
    const suffix = Date.now().toString().slice(-8);
    const res = await callFunction(page, 'create-staff-account', {
      name: `E2E Authz Temp ${suffix}`,
      department: 'reception',
      username: `e2eauthz${suffix}`,
      pin: '246810',
    });
    console.log('create-staff-account, property_admin own hotel:', res.status, res.body);
    results.push(report('create-staff-account: property_admin + propria property -> ALLOW', res.status === 200, `status=${res.status}`));
  } else {
    results.push(report('create-staff-account: property_admin + propria property -> ALLOW', false, 'login failed'));
  }
  await browser.close();
}

// organization_admin (master) + property della propria org, diversa dal
// proprio hotel di default (Hotel Demo 2) -> ALLOW
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_MASTER_EMAIL, process.env.E2E_MASTER_PASSWORD);
  if (auth.status === 200 && formGone) {
    const suffix = Date.now().toString().slice(-8);
    const res = await callFunction(page, 'create-staff-account', {
      hotelId: HOTEL2_ID,
      role: 'operatore',
      name: `E2E Authz Temp Org ${suffix}`,
      department: 'reception',
      username: `e2eauthzorg${suffix}`,
      pin: '135791',
    });
    console.log('create-staff-account, master on Hotel Demo 2 (own org):', res.status, res.body);
    results.push(report('create-staff-account: organization_admin + property propria org -> ALLOW', res.status === 200, `status=${res.status}`));
  } else {
    results.push(report('create-staff-account: organization_admin + property propria org -> ALLOW', false, 'login failed'));
  }
  await browser.close();
}

// organization_admin (master, org A) + property fuori org (Hotel Demo 3,
// org B) -> DENY
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_MASTER_EMAIL, process.env.E2E_MASTER_PASSWORD);
  if (auth.status === 200 && formGone) {
    const res = await callFunction(page, 'create-staff-account', {
      hotelId: HOTEL3_ID,
      role: 'operatore',
      name: 'Should Not Be Created (cross-org)',
      department: 'reception',
      username: `shouldnotexistcrossorg${Date.now()}`,
      pin: '975310',
    });
    console.log('create-staff-account, master targeting Hotel Demo 3 (cross-org):', res.status, res.body);
    results.push(report('create-staff-account: organization_admin + property fuori org -> DENY', res.status === 403, `status=${res.status}`));
  } else {
    results.push(report('create-staff-account: organization_admin + property fuori org -> DENY', false, 'master login failed'));
  }
  await browser.close();
}

// suspended/inactive -> DENY (fixture disponibile è un operatore sospeso,
// che non avrebbe comunque il permesso core.staff.manage indipendentemente
// dallo stato active — questo test dimostra che il gate .active blocca la
// chiamata, non che isoli .active come unica causa di denial)
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginOperator(page, process.env.E2E_SUSPENDED_USERNAME, process.env.E2E_SUSPENDED_PIN);
  if (auth.status === 200) {
    const res = await callFunction(page, 'create-staff-account', {
      name: 'Should Not Be Created',
      department: 'reception',
      username: `shouldnotexist${Date.now()}`,
      pin: '111111',
    });
    console.log('create-staff-account, suspended caller:', res.status, res.body);
    results.push(report('create-staff-account: suspended/inactive -> DENY', res.status === 403, `status=${res.status} formGone=${formGone}`));
  } else {
    results.push(report('create-staff-account: suspended/inactive -> DENY', false, `auth itself failed unexpectedly: ${auth.status}`));
  }
  await browser.close();
}

// ---------------------------------------------------------------------------
// sync-pms-stays
// ---------------------------------------------------------------------------

// property_admin + permission + entitlement -> ALLOW (authorization must
// pass; the sync itself may still legitimately fail downstream with a
// business-logic 400 like not_configured/incomplete_configuration if OHIP
// credentials aren't set up for this demo hotel — that is NOT an
// authorization denial, so only a 403 counts as failure here)
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
  if (auth.status === 200 && formGone) {
    const res = await callFunction(page, 'sync-pms-stays', {});
    console.log('sync-pms-stays, property_admin own hotel:', res.status, res.body);
    results.push(report('sync-pms-stays: property_admin + permission + entitlement -> ALLOW (not 403)', res.status !== 403, `status=${res.status}`));
  } else {
    results.push(report('sync-pms-stays: property_admin + permission + entitlement -> ALLOW (not 403)', false, 'login failed'));
  }
  await browser.close();
}

// organization_admin + property propria org -> ALLOW. Note: uses master's
// OWN default hotel (Hotel Demo), not Hotel Demo 2 -- Hotel Demo 2's
// guest_requests entitlement is deliberately disabled (see the next case),
// so it can't also serve as the "org-wide reach to a non-default hotel"
// case for PMS specifically. This does not fully isolate org-wide reach
// from "it's their own hotel" the way the create-staff-account case above
// does -- a coverage gap, not a false positive; closing it needs a third,
// entitled hotel under master's org.
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_MASTER_EMAIL, process.env.E2E_MASTER_PASSWORD);
  if (auth.status === 200 && formGone) {
    const res = await callFunction(page, 'sync-pms-stays', { hotelId: HOTEL1_ID });
    console.log('sync-pms-stays, master on Hotel Demo:', res.status, res.body);
    results.push(report('sync-pms-stays: organization_admin + property propria org -> ALLOW (not 403)', res.status !== 403, `status=${res.status}`));
  } else {
    results.push(report('sync-pms-stays: organization_admin + property propria org -> ALLOW (not 403)', false, 'login failed'));
  }
  await browser.close();
}

// property fuori org (Hotel Demo 3, org B) -> DENY
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_MASTER_EMAIL, process.env.E2E_MASTER_PASSWORD);
  if (auth.status === 200 && formGone) {
    const res = await callFunction(page, 'sync-pms-stays', { hotelId: HOTEL3_ID });
    console.log('sync-pms-stays, master targeting Hotel Demo 3 (cross-org):', res.status, res.body);
    results.push(report('sync-pms-stays: property fuori org -> DENY', res.status === 403, `status=${res.status}`));
  } else {
    results.push(report('sync-pms-stays: property fuori org -> DENY', false, 'master login failed'));
  }
  await browser.close();
}

// entitlement guest_requests disabled -> DENY. This is the case where old
// and new behavior actually diverge: the legacy role-only check never
// looked at entitlement at all, so this call could previously succeed (or
// fail for unrelated reasons) even with the module switched off.
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_HOTEL2_ADMIN_EMAIL, process.env.E2E_HOTEL2_ADMIN_PASSWORD);
  if (auth.status === 200 && formGone) {
    const res = await callFunction(page, 'sync-pms-stays', {});
    console.log('sync-pms-stays, Hotel Demo 2 admin (entitlement disabled):', res.status, res.body);
    results.push(report('sync-pms-stays: PMS entitlement disabled -> DENY', res.status === 403, `status=${res.status}`));
  } else {
    results.push(report('sync-pms-stays: PMS entitlement disabled -> DENY', false, 'login failed'));
  }
  await browser.close();
}

// permission assente (receptionist non ha guest_requests.pms.manage) -> DENY
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginOperator(page, process.env.E2E_OPERATOR_USERNAME, process.env.E2E_OPERATOR_PIN);
  if (auth.status === 200 && formGone) {
    const res = await callFunction(page, 'sync-pms-stays', {});
    console.log('sync-pms-stays, operatore (no pms.manage):', res.status, res.body);
    results.push(report('sync-pms-stays: PMS permission missing -> DENY', res.status === 403, `status=${res.status}`));
  } else {
    results.push(report('sync-pms-stays: PMS permission missing -> DENY', false, 'login failed'));
  }
  await browser.close();
}

// suspended/inactive -> DENY (same caveat as the create-staff-account case)
{
  const { browser, page } = await newPage();
  const { auth } = await loginOperator(page, process.env.E2E_SUSPENDED_USERNAME, process.env.E2E_SUSPENDED_PIN);
  if (auth.status === 200) {
    const res = await callFunction(page, 'sync-pms-stays', {});
    console.log('sync-pms-stays, suspended caller:', res.status, res.body);
    results.push(report('sync-pms-stays: suspended/inactive -> DENY', res.status === 403, `status=${res.status}`));
  } else {
    results.push(report('sync-pms-stays: suspended/inactive -> DENY', false, `auth itself failed unexpectedly: ${auth.status}`));
  }
  await browser.close();
}

console.log('\n=== SUMMARY (staff-and-pms-authorization) ===');
const allOk = results.every(Boolean);
console.log(allOk ? 'ALL PASS (incl. explicit SKIPs)' : 'SOME FAILED');
if (!allOk) process.exit(1);
