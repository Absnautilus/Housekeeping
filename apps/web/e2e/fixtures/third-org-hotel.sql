-- Demo/test-only E2E fixture: a THIRD hotel, under its OWN organization,
-- with its OWN property_admin -- deliberately independent from the
-- organization_admin (master) fixture used everywhere else in this E2E
-- suite. Needed specifically to close two SKIPped cross-organization
-- boundary tests in staff-and-pms-authorization.mjs: master today has an
-- organization_admin membership on BOTH existing organizations (Hotel
-- Demo's and Hotel Demo 2's -- backfill_staff_identity() gives master one
-- membership per organization that existed when it ran), so no hotel is
-- currently outside master's reach to prove a DENY against.
--
-- Idempotent and safe to re-run: every insert is ON CONFLICT DO NOTHING,
-- keyed on the fixed ids below. Run this in the Studio SQL Editor against
-- the shared Hotsflow project.
--
-- IMPORTANT -- two-step process, in this order:
--   1. Run the block below AS IS first. It creates the hotel/organization/
--      property/mapping/entitlement -- everything that is plain data, no
--      real auth.users invariants involved.
--   2. Create ONE new real auth user for "Admin B" (Authentication -> Users
--      -> Add user, or `npx supabase auth admin create-user --project-ref
--      <ref> --email admin-b-e2e@example.test --password '<something>'
--      --data '{}'` -- same as every other demo account, see the main
--      README's staff-account section). Auto Confirm User: on.
--   3. Take that new user's id and run the second block at the bottom,
--      replacing the placeholder, to link it to staff_profiles + backfill.

begin;

insert into hotels (id, name, timezone, active) values
  ('00000000-0000-0000-0000-000000000003', 'Hotel Demo 3 (E2E cross-org boundary)', 'Europe/Rome', true)
on conflict (id) do nothing;

select backfill_legacy_property_mapping();
select backfill_guest_requests_entitlement();

commit;

-- ---------------------------------------------------------------------------
-- STEP 3 -- run this AFTER creating the auth user in step 2 above, with
-- its real id substituted for the placeholder.
-- ---------------------------------------------------------------------------
-- insert into staff_profiles (hotel_id, auth_user_id, name, role, department, active, login_username) values
--   ('00000000-0000-0000-0000-000000000003', '<ADMIN_B_AUTH_USER_ID>', 'Admin B (E2E, Hotel Demo 3)', 'admin', null, true, null)
-- on conflict (auth_user_id) do nothing;
-- select backfill_staff_identity();

-- Verify afterwards: this must show ZERO rows -- master must have no
-- membership at all reaching this property (that's the entire point of
-- this fixture).
-- select m.* from memberships m
--   join properties p on p.id = m.property_id or p.organization_id = m.organization_id
--   join legacy_property_mapping lm on lm.platform_property_id = p.id
--   join staff_profiles sp on sp.auth_user_id = m.profile_id
--   where lm.legacy_hotel_id = '00000000-0000-0000-0000-000000000003'
--     and sp.auth_user_id = (select auth_user_id from staff_profiles where hotel_id != '00000000-0000-0000-0000-000000000003' and role = 'master' limit 1);
