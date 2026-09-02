-- Demo/test-only E2E fixture: a THIRD hotel, under its OWN organization,
-- with its OWN property_admin -- deliberately independent from the
-- organization_admin (master) fixture used everywhere else in this E2E
-- suite. Needed specifically to close two cross-organization boundary
-- tests in staff-and-pms-authorization.mjs: master has an organization_
-- admin membership on BOTH existing organizations (Hotel Demo's and Hotel
-- Demo 2's -- backfill_staff_identity() gives master one membership per
-- organization that existed when it ran), so no hotel was outside
-- master's reach to prove a DENY against until this one exists.
--
-- IMPORTANT -- do NOT call backfill_guest_requests_entitlement() or
-- backfill_staff_identity() for this fixture. Both are WHOLE-TABLE
-- operations, not scoped to the new hotel, and both bit during the first
-- real run of this file against the live project:
--   - backfill_guest_requests_entitlement() iterates every mapped
--     property and raises the moment it hits one with a pre-existing
--     enabled=false row -- which Hotel Demo 2 always has, on purpose (the
--     entitlement-disabled E2E fixture). It will never complete again on
--     this project as long as Hotel Demo 2 exists in that state.
--   - backfill_staff_identity() iterates every staff_profiles row,
--     including master's, and (per its own documented D2 mapping) grants
--     master ONE organization_admin membership per organization that
--     EXISTS at the moment it runs -- including this fixture's brand new
--     Organization B, the instant it exists. Re-running it after creating
--     Hotel Demo 3 silently gave master org-wide reach into it, exactly
--     what this fixture exists to prevent. Had to be found and manually
--     deleted (a single memberships row) before the isolation held.
-- Both replaced below with direct inserts scoped to only this fixture's
-- own rows -- same end state, zero side effects on any other property or
-- staff member.
--
-- Idempotent and safe to re-run: every insert is ON CONFLICT DO NOTHING,
-- keyed on the fixed ids below. Run this in the Studio SQL Editor against
-- the shared Hotsflow project.
--
-- Three-step process, in this order:
--   1. Run the "plain data" block below first.
--   2. Create ONE new real auth user for "Admin B" (Authentication -> Users
--      -> Add user, or `npx supabase auth admin create-user --project-ref
--      <ref> --email admin-b-e2e@example.test --password '<something>'
--      --data '{}'` -- same as every other demo account, see the main
--      README's staff-account section). Auto Confirm User: on.
--   3. Take that new user's id and run the "link Admin B" block at the
--      bottom, replacing the placeholder.

begin;

insert into hotels (id, name, timezone, active) values
  ('00000000-0000-0000-0000-000000000003', 'Hotel Demo 3 (E2E cross-org boundary)', 'Europe/Rome', true)
on conflict (id) do nothing;

select backfill_legacy_property_mapping();

-- Scoped equivalent of backfill_guest_requests_entitlement(), for this one
-- property only -- see the header above for why the real function can no
-- longer be called at all on this project.
insert into property_modules (property_id, module_id, enabled)
select m.platform_property_id, mod.id, true
from legacy_property_mapping m, modules mod
where m.legacy_hotel_id = '00000000-0000-0000-0000-000000000003'
  and mod.slug = 'guest_requests'
on conflict (property_id, module_id) do nothing;

commit;

-- ---------------------------------------------------------------------------
-- STEP 3 -- run this AFTER creating the auth user in step 2 above, with
-- its real id substituted for both placeholders below.
-- ---------------------------------------------------------------------------
-- begin;
-- insert into staff_profiles (hotel_id, auth_user_id, name, role, department, active, login_username) values
--   ('00000000-0000-0000-0000-000000000003', '<ADMIN_B_AUTH_USER_ID>', 'Admin B (E2E, Hotel Demo 3)', 'admin', null, true, null)
-- on conflict (auth_user_id) do nothing;
--
-- -- Scoped equivalent of backfill_staff_identity()'s admin -> property_admin
-- -- mapping, for this one profile only -- see the header above for why the
-- -- real function must not be called here.
-- insert into profiles (id, full_name)
-- values ('<ADMIN_B_AUTH_USER_ID>', 'Admin B (E2E, Hotel Demo 3)')
-- on conflict (id) do nothing;
--
-- insert into memberships (profile_id, property_id, role_id, status)
-- select '<ADMIN_B_AUTH_USER_ID>', m.platform_property_id, r.id, 'active'
-- from legacy_property_mapping m, roles r
-- where m.legacy_hotel_id = '00000000-0000-0000-0000-000000000003'
--   and r.slug = 'property_admin'
-- on conflict do nothing;
-- commit;

-- Verify afterwards: this must show ZERO rows -- master must have no
-- membership at all reaching this property or its organization (that's
-- the entire point of this fixture).
-- select sp.name as master_name, m.*
-- from memberships m
-- join staff_profiles sp on sp.auth_user_id = m.profile_id
-- where sp.role = 'master'
--   and (
--     m.property_id = (select platform_property_id from legacy_property_mapping where legacy_hotel_id = '00000000-0000-0000-0000-000000000003')
--     or m.organization_id = (
--       select organization_id from properties
--       where id = (select platform_property_id from legacy_property_mapping where legacy_hotel_id = '00000000-0000-0000-0000-000000000003')
--     )
--   );
