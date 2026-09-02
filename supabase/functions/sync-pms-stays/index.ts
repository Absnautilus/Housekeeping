// Pulls today's checked-in reservations from OperaCloud (via OHIP — Oracle
// Hospitality Integration Platform) for one hotel and upserts them into
// rooms/stays. Runs as an Edge Function because it needs to make outbound
// HTTPS calls (Postgres can't) and needs the OHIP client secret, which must
// never reach the browser — mirrors the create-staff-account function's
// "caller-scoped client to check who's calling, service-role client to do
// the privileged work" shape.
//
// NOTE: the OHIP reservations endpoint path/query params below follow
// Oracle's publicly documented RSV module shape (see
// github.com/oracle/hospitality-api-docs) but haven't been verified against
// a live OHIP tenant. Once real credentials are wired up, check
// last_sync_error after a sync attempt (returned by this function and
// stored on pms_integrations) and adjust OHIP_RESERVATIONS_PATH /
// mapReservation() below against the Postman collection in your OHIP
// Developer Portal (Applications → your app → API Docs) if it 404s or the
// response shape doesn't match.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PmsIntegration {
  hotel_id: string
  mode: 'manual' | 'opera'
  ohip_hotel_code: string | null
  ohip_enterprise_id: string | null
  ohip_gateway_url: string | null
  ohip_client_id: string | null
  ohip_client_secret: string | null
  ohip_app_key: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'missing_authorization' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // caller-scoped client: RLS still applies, so this can only ever see
    // the caller's own staff_profiles row
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await callerClient.auth.getUser()
    if (!user) return json({ error: 'invalid_session' }, 401)

    // caller.active: same distinct liveness gate as create-staff-account —
    // see its comment. has_permission() below only checks
    // memberships.status, never staff_profiles.active.
    const { data: caller, error: callerError } = await callerClient
      .from('staff_profiles')
      .select('id, hotel_id, active')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (callerError || !caller || !caller.active) {
      return json({ error: 'forbidden' }, 403)
    }

    // current_staff_is_master(): Core-derived, used only to resolve which
    // hotel the caller may target (org-wide vs. pinned to their own),
    // exactly as before. The authorization decision is the single
    // has_permission() call below, once hotelId resolves to a property_id.
    const { data: isOrgWide, error: orgWideError } = await callerClient.rpc('current_staff_is_master')
    if (orgWideError) {
      return json({ error: 'forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const hotelId = isOrgWide ? String(body.hotelId ?? '') : caller.hotel_id
    if (!hotelId) return json({ error: 'invalid_input' }, 400)

    // The sole authorization gate: guest_requests_property_for_hotel()
    // resolves hotelId to a property_id (null if unmapped), then
    // has_permission() checks guest_requests.pms.manage there -- module-
    // owned, so this also automatically denies when the guest_requests
    // module is disabled for that property (has_permission() folds module
    // entitlement in for module-owned permissions), which the legacy check
    // never verified at all. Must run before any privileged (service-role)
    // operation below.
    const { data: propertyId, error: propertyError } = await callerClient.rpc('guest_requests_property_for_hotel', {
      p_hotel_id: hotelId,
    })
    if (propertyError) {
      return json({ error: 'forbidden' }, 403)
    }
    const { data: allowed, error: allowedError } = await callerClient.rpc('has_permission', {
      p_property_id: propertyId,
      p_permission_slug: 'guest_requests.pms.manage',
    })
    if (allowedError || !allowed) {
      return json({ error: 'forbidden' }, 403)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: integration, error: integrationError } = await admin
      .from('pms_integrations')
      .select('*')
      .eq('hotel_id', hotelId)
      .maybeSingle()

    if (integrationError || !integration) {
      return json({ error: 'not_configured' }, 400)
    }
    if (integration.mode !== 'opera') {
      return json({ error: 'not_in_opera_mode' }, 400)
    }
    if (!integration.ohip_client_id || !integration.ohip_client_secret || !integration.ohip_gateway_url || !integration.ohip_hotel_code) {
      return json({ error: 'incomplete_configuration' }, 400)
    }

    const result = await syncHotel(admin, integration as PmsIntegration)

    await admin
      .from('pms_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.ok ? 'success' : 'error',
        last_sync_error: result.ok ? null : result.error,
      })
      .eq('hotel_id', hotelId)

    return json(result, result.ok ? 200 : 502)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown_error' }, 500)
  }
})

async function syncHotel(
  // deno-lint-ignore no-explicit-any
  admin: any,
  integration: PmsIntegration,
): Promise<{ ok: true; created: number; updated: number } | { ok: false; error: string }> {
  try {
    const token = await getOhipToken(integration)
    const reservations = await fetchArrivals(integration, token)

    let created = 0
    let updated = 0

    for (const resv of reservations) {
      const mapped = mapReservation(resv)
      if (!mapped) continue

      const { data: room, error: roomError } = await admin
        .from('rooms')
        .upsert({ hotel_id: integration.hotel_id, room_number: mapped.roomNumber, active: true }, { onConflict: 'hotel_id,room_number' })
        .select('id')
        .single()
      if (roomError || !room) continue

      const { data: existing } = await admin
        .from('stays')
        .select('id')
        .eq('hotel_id', integration.hotel_id)
        .eq('external_stay_id', mapped.externalStayId)
        .eq('source', 'opera')
        .maybeSingle()

      if (existing) {
        await admin
          .from('stays')
          .update({
            room_id: room.id,
            guest_last_name: mapped.guestLastName,
            check_in_at: mapped.checkInAt,
            check_out_at: mapped.checkOutAt,
          })
          .eq('id', existing.id)
        updated++
      } else {
        // guest_pin is left unset: the stays table defaults it to a fresh
        // random 4-digit code (see migration 0010), same as a manually
        // activated stay.
        await admin.from('stays').insert({
          hotel_id: integration.hotel_id,
          room_id: room.id,
          guest_last_name: mapped.guestLastName,
          check_in_at: mapped.checkInAt,
          check_out_at: mapped.checkOutAt,
          status: 'active',
          source: 'opera',
          external_stay_id: mapped.externalStayId,
        })
        created++
      }
    }

    return { ok: true, created, updated }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'sync_failed' }
  }
}

async function getOhipToken(integration: PmsIntegration): Promise<string> {
  const res = await fetch(`${integration.ohip_gateway_url}/oauth/v1/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-app-key': integration.ohip_app_key ?? '',
      Authorization: 'Basic ' + btoa(`${integration.ohip_client_id}:${integration.ohip_client_secret}`),
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`ohip_token_failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('ohip_token_missing_access_token')
  return data.access_token as string
}

// See the file-level NOTE above.
async function fetchArrivals(integration: PmsIntegration, token: string): Promise<unknown[]> {
  const today = new Date().toISOString().slice(0, 10)
  const url =
    `${integration.ohip_gateway_url}/rsv/v1/hotels/${integration.ohip_hotel_code}/reservations` +
    `?arrivalDate=${today}&reservationStatus=CheckedIn`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-app-key': integration.ohip_app_key ?? '',
      'x-hotelId': integration.ohip_hotel_code ?? '',
      ...(integration.ohip_enterprise_id ? { 'x-enterpriseId': integration.ohip_enterprise_id } : {}),
    },
  })
  if (!res.ok) throw new Error(`ohip_reservations_failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.reservations ?? data.reservationInfo ?? []) as unknown[]
}

interface MappedReservation {
  externalStayId: string
  roomNumber: string
  guestLastName: string
  checkInAt: string
  checkOutAt: string
}

// Best-effort shape based on OHIP's public RSV schema; adjust the field
// paths below once a real response is available (see the file-level NOTE).
// deno-lint-ignore no-explicit-any
function mapReservation(resv: any): MappedReservation | null {
  const roomNumber = resv?.roomStay?.roomId ?? resv?.roomNumber
  const reservationId = resv?.reservationIdList?.[0]?.id ?? resv?.confirmationNumber
  const lastName = resv?.reservationGuests?.[0]?.profileInfo?.profile?.customer?.personName?.[0]?.surname
  const checkIn = resv?.roomStay?.arrivalDate
  const checkOut = resv?.roomStay?.departureDate

  if (!roomNumber || !reservationId || !lastName || !checkIn || !checkOut) return null

  return {
    externalStayId: String(reservationId),
    roomNumber: String(roomNumber),
    guestLastName: String(lastName),
    checkInAt: new Date(checkIn).toISOString(),
    checkOutAt: new Date(checkOut).toISOString(),
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
