// Step 8 extended E2E — items 8, 10.
import { newPage, loginEmail, loginOperator, restGet, rpc, report } from './lib.mjs';

const HOTEL1_ID = '00000000-0000-0000-0000-000000000001';
const HOTEL2_ID = '00000000-0000-0000-0000-000000000002';

const results = [];

// ---------------------------------------------------------------------------
// Item 8 — entitlement disabled (Hotel Demo 2's guest_requests module)
// ---------------------------------------------------------------------------
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_HOTEL2_ADMIN_EMAIL, process.env.E2E_HOTEL2_ADMIN_PASSWORD);
  console.log('admin.hotel2 auth status:', auth.status, 'formGone:', formGone);

  if (auth.status === 200 && formGone) {
    // Auth + the roster self-select both succeed (has_property_access
    // doesn't check module entitlement, only has_permission/has_module/
    // current_staff_hotel() do) — so this admin DOES reach the dashboard
    // shell. What must actually be gated is the guest_requests row
    // visibility itself, via current_staff_hotel() resolving to NULL.
    const res = await restGet(page, `guest_requests?hotel_id=eq.${HOTEL2_ID}&select=id`);
    let rows = [];
    try {
      rows = JSON.parse(res.body);
    } catch {
      rows = null;
    }
    const emptied = res.status === 200 && Array.isArray(rows) && rows.length === 0;
    console.log('admin.hotel2 guest_requests query (own hotel, module disabled):', res.status, res.body);
    results.push(
      report(
        'entitlement disabilitata: la coda guest_requests di Hotel Demo 2 risulta vuota per il suo stesso admin (current_staff_hotel() → NULL)',
        emptied,
        `status=${res.status} rows=${rows?.length} — nota: la dashboard si carica normalmente, nessun messaggio esplicito di modulo disabilitato in UI`,
      ),
    );
  } else {
    results.push(report('entitlement disabilitata: la coda guest_requests di Hotel Demo 2 risulta vuota', false, `login unexpectedly failed: auth=${auth.status} formGone=${formGone}`));
  }
  await browser.close();
}

// ---------------------------------------------------------------------------
// Item 10 — PMS status/save gated by guest_requests.pms.manage
// ---------------------------------------------------------------------------

// (a) property_admin (Hotel Demo, entitled) — ALLOWED, both read and write.
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
  if (auth.status === 200 && formGone) {
    const statusRes = await rpc(page, 'get_pms_integration_status', { p_hotel_id: HOTEL1_ID });
    console.log('admin.demo3 PMS status:', statusRes.status, statusRes.body);
    results.push(report('PMS status: property_admin CONSENTITO su Hotel Demo (entitled)', statusRes.status === 200, `status=${statusRes.status}`));

    const saveRes = await rpc(page, 'save_pms_integration', {
      p_hotel_id: HOTEL1_ID,
      p_mode: 'manual',
      p_ohip_hotel_code: null,
      p_ohip_enterprise_id: null,
      p_ohip_gateway_url: null,
      p_ohip_client_id: null,
      p_ohip_client_secret: null,
      p_ohip_app_key: null,
    });
    console.log('admin.demo3 PMS save:', saveRes.status, saveRes.body);
    results.push(report('PMS save: property_admin CONSENTITO su Hotel Demo (entitled)', saveRes.status === 200 || saveRes.status === 204, `status=${saveRes.status}`));
  } else {
    results.push(report('PMS status: property_admin CONSENTITO su Hotel Demo', false, 'login failed'));
    results.push(report('PMS save: property_admin CONSENTITO su Hotel Demo', false, 'login failed'));
  }
  await browser.close();
}

// (b) Admin Hotel2 Demo — DENIED, entitlement disabled on their property.
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, process.env.E2E_HOTEL2_ADMIN_EMAIL, process.env.E2E_HOTEL2_ADMIN_PASSWORD);
  if (auth.status === 200 && formGone) {
    const statusRes = await rpc(page, 'get_pms_integration_status', { p_hotel_id: HOTEL2_ID });
    console.log('admin.hotel2 PMS status:', statusRes.status, statusRes.body);
    const denied = statusRes.status >= 400;
    results.push(report('PMS status: NEGATO su Hotel Demo 2 (entitlement disabilitata)', denied, `status=${statusRes.status} body=${statusRes.body}`));
  } else {
    results.push(report('PMS status: NEGATO su Hotel Demo 2 (entitlement disabilitata)', false, 'login unexpectedly failed'));
  }
  await browser.close();
}

// (c) Operatore Demo — DENIED, role has no guest_requests.pms.manage at all.
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginOperator(page, process.env.E2E_OPERATOR_USERNAME, process.env.E2E_OPERATOR_PIN);
  if (auth.status === 200 && formGone) {
    const statusRes = await rpc(page, 'get_pms_integration_status', { p_hotel_id: HOTEL1_ID });
    console.log('operatore PMS status:', statusRes.status, statusRes.body);
    const denied = statusRes.status >= 400;
    results.push(report('PMS status: NEGATO a operatore (receptionist non ha guest_requests.pms.manage)', denied, `status=${statusRes.status} body=${statusRes.body}`));
  } else {
    results.push(report('PMS status: NEGATO a operatore', false, 'login unexpectedly failed'));
  }
  await browser.close();
}

console.log('\n=== SUMMARY (entitlement-and-pms) ===');
const allOk = results.every(Boolean);
console.log(allOk ? 'ALL PASS' : 'SOME FAILED');
if (!allOk) process.exit(1);
