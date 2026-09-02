// Step 8 extended E2E — items 1, 2, 3 (master side), 4, 9 (master side).
import { newPage, loginOperator, loginEmail, restGet, report } from './lib.mjs';

const BAIT_ID = '00000000-0000-0000-0000-0000000baa02'; // guest_requests row that belongs to Hotel Demo 2
const HOTEL2_ID = '00000000-0000-0000-0000-000000000002';

const OP_USERNAME = process.env.E2E_OPERATOR_USERNAME;
const OP_PIN = process.env.E2E_OPERATOR_PIN;
const MASTER_EMAIL = process.env.E2E_MASTER_EMAIL;
const MASTER_PASSWORD = process.env.E2E_MASTER_PASSWORD;

const results = [];

// ---------------------------------------------------------------------------
// Item 1 — login operatore
// ---------------------------------------------------------------------------
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginOperator(page, OP_USERNAME, OP_PIN);
  console.log('operatore auth status:', auth.status);
  results.push(report('login operatore', auth.status === 200 && formGone, `auth=${auth.status} formGone=${formGone}`));

  // Item 4 — department-scoped visibility: every guest_requests row the
  // operatore's own dashboard fetch returns must be assigned_department =
  // 'housekeeping' (their own department), and there must be at least one.
  if (formGone) {
    const res = await restGet(page, `guest_requests?hotel_id=eq.00000000-0000-0000-0000-000000000001&select=id,assigned_department`);
    let rows = [];
    try {
      rows = JSON.parse(res.body);
    } catch {
      rows = null;
    }
    const ok = res.status === 200 && Array.isArray(rows) && rows.length > 0 && rows.every((r) => r.assigned_department === 'housekeeping');
    console.log('operatore-visible guest_requests departments:', rows ? [...new Set(rows.map((r) => r.assigned_department))] : res.body);
    results.push(report('operatore vede solo il proprio department (housekeeping)', ok, `status=${res.status} rows=${rows?.length}`));
  } else {
    results.push(report('operatore vede solo il proprio department (housekeeping)', false, 'skipped, login failed'));
  }

  await browser.close();
}

// ---------------------------------------------------------------------------
// Item 2 — login ex-master
// ---------------------------------------------------------------------------
{
  const { browser, page } = await newPage();
  const { auth, formGone } = await loginEmail(page, MASTER_EMAIL, MASTER_PASSWORD);
  console.log('master auth status:', auth.status);
  results.push(report('login ex-master', auth.status === 200 && formGone, `auth=${auth.status} formGone=${formGone}`));

  if (formGone) {
    // Item 9 (master side) — master holds an organization_admin membership
    // in BOTH organizations (Hotel Demo's and Hotel Demo 2's — verified via
    // SQL earlier), but guest_requests visibility is legacy single-hotel
    // (current_staff_hotel()), never org-wide. A direct fetch of Hotel
    // Demo 2's bait row, by its real id, must come back EMPTY — not a 403,
    // an empty result set, which is how Postgrest RLS denial looks.
    const res = await restGet(page, `guest_requests?id=eq.${BAIT_ID}&select=id,hotel_id`);
    let rows = [];
    try {
      rows = JSON.parse(res.body);
    } catch {
      rows = null;
    }
    const denied = res.status === 200 && Array.isArray(rows) && rows.length === 0;
    console.log('master fetch of Hotel Demo 2 bait row:', res.status, res.body);
    results.push(
      report(
        'ex-master NON accede alle richieste di Hotel Demo 2 (nonostante membership organization_admin in quell\'organizzazione)',
        denied,
        `status=${res.status} rows_returned=${rows?.length}`,
      ),
    );

    // Item 3 (master side) — roster visibility IS org-wide for master
    // (guest_requests_staff_roster_visible uses has_organization_access,
    // unlike guest_requests itself). Master should see staff from BOTH
    // hotels in one roster query.
    const rosterRes = await restGet(page, `staff_profiles?select=name,hotel_id&order=name`);
    let roster = [];
    try {
      roster = JSON.parse(rosterRes.body);
    } catch {
      roster = null;
    }
    const hotelIdsSeen = roster ? new Set(roster.map((r) => r.hotel_id)) : new Set();
    const seesBoth = rosterRes.status === 200 && hotelIdsSeen.has('00000000-0000-0000-0000-000000000001') && hotelIdsSeen.has(HOTEL2_ID);
    console.log('master roster hotel_ids seen:', [...hotelIdsSeen]);
    results.push(report('ex-master vede il roster di ENTRAMBI gli hotel (org-wide, a differenza di guest_requests)', seesBoth, `hotels_seen=${hotelIdsSeen.size}`));
  } else {
    results.push(report('ex-master NON accede alle richieste di Hotel Demo 2', false, 'skipped, login failed'));
    results.push(report('ex-master vede il roster di ENTRAMBI gli hotel', false, 'skipped, login failed'));
  }

  await browser.close();
}

console.log('\n=== SUMMARY (operator-and-master) ===');
const allOk = results.every(Boolean);
console.log(allOk ? 'ALL PASS' : 'SOME FAILED');
if (!allOk) process.exit(1);
