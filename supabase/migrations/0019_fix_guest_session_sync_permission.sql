-- sync_guest_sessions_on_stay_change() was defined without `security
-- definer`, so its internal `update guest_sessions ...` runs as the calling
-- role (`authenticated`) instead of the table owner. guest_sessions
-- deliberately has no RLS policies and no grant to `authenticated` at all
-- (see 0003_rls.sql's comment: "reachable only through the SECURITY
-- DEFINER functions in 0002") -- so every checkout, checkout extension, and
-- deactivation, which all update stays.status or stays.check_out_at and
-- fire this trigger, has always failed with "permission denied for table
-- guest_sessions", aborting the whole stays update. This went unnoticed
-- because the client never surfaced the error until this session's Stays
-- and admin-action fixes started actually checking for and displaying it.
create or replace function sync_guest_sessions_on_stay_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'active' then
    update guest_sessions set revoked_at = now()
      where stay_id = new.id and revoked_at is null;
  elsif new.check_out_at <> old.check_out_at then
    if new.check_out_at < old.check_out_at then
      update guest_sessions set revoked_at = now()
        where stay_id = new.id and revoked_at is null and expires_at > new.check_out_at;
    end if;
    update guest_sessions set expires_at = new.check_out_at
      where stay_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;
