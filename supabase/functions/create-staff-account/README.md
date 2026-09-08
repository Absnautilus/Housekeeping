# Shared Core dependency

`create-staff-account` may create legacy Housekeeping identities only for hotels that are not mapped to Hotsflow Core.

The function is deployed to the shared Core Supabase project and requires these Core-owned RPCs:

- `legacy_hotel_is_embedded(uuid)` to reject mapped properties before any privileged operation;
- `guest_requests_staff_manage_allowed(uuid)` for the authorization decision;
- `current_staff_is_master()` to constrain the requested hotel and legacy role.

The old standalone Housekeeping backend is frozen and does not own this newer contract. Missing or failing RPCs are an authorization failure; do not add a permissive fallback.
