// Creates a staff account (auth user + staff_profiles row): an admin for a
// hotel (real email + password) or an operatore (username + 6-digit PIN,
// chosen by whoever creates the account). Needs the service_role key
// (auth.admin.createUser), which must never reach the browser — that's the
// entire reason this runs as an Edge Function instead of a client-side insert.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// operatore accounts have no real email; Supabase Auth still needs one, so
// we synthesize it from the username. Mirrors apps/web/src/lib/operator-login.ts
// — keep both in sync.
const OPERATOR_EMAIL_DOMAIN = 'staff.local'

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, '')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'missing_authorization' }, 401)
    }

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

    // No separate staff_profiles.active check here: as of migration
    // 20260827122600, guest_requests_staff_manage_allowed() (the sole
    // authorization gate below) checks current_staff_active() internally,
    // and current_staff_is_master() (called next, for input-shaping only)
    // already checked sp.active before that migration too. Nothing
    // privileged happens between this fetch and that RPC call (no service-
    // role client, no write) — an explicit check here would only move a
    // 403 slightly earlier for the exact same caller, duplicating the one
    // authoritative gate instead of relying on it. This is different from
    // sync-pms-stays (see its own comment): that function's authorization
    // primitives, guest_requests_property_for_hotel()/has_permission(),
    // were never touched by 20260827122600 and still don't check .active
    // at all.
    const { data: caller, error: callerError } = await callerClient
      .from('staff_profiles')
      .select('id, hotel_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (callerError || !caller) {
      return json({ error: 'forbidden' }, 403)
    }

    // current_staff_is_master() is Core-derived (redefined in Fase 2 Step 6
    // to read memberships/roles, not staff_profiles.role) -- used here only
    // to resolve which hotel/role the caller is even allowed to REQUEST
    // (org-wide callers may target any hotel and either role; everyone else
    // is pinned to their own hotel, operatore only), exactly as before.
    // The actual authorization decision is the single
    // guest_requests_staff_manage_allowed() call below, once hotelId is
    // known -- this is not a second, parallel authorization path.
    const { data: isOrgWide, error: orgWideError } = await callerClient.rpc('current_staff_is_master')
    if (orgWideError) {
      return json({ error: 'forbidden' }, 403)
    }

    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const requestedRole = body.role === 'admin' ? 'admin' : 'operatore'

    // a hotel admin can only ever create operatori for its own hotel; only
    // an org-wide caller can create another hotel's admin, and picks which
    // hotel
    const role: 'admin' | 'operatore' = isOrgWide ? requestedRole : 'operatore'
    const hotelId = isOrgWide ? String(body.hotelId ?? '') : caller.hotel_id

    if (!name || !hotelId) {
      return json({ error: 'invalid_input' }, 400)
    }

    // The sole authorization gate: does the caller have core.staff.manage
    // (directly or org-wide) over the property this hotelId maps to? Must
    // run before any privileged (service-role) operation below.
    const { data: allowed, error: allowedError } = await callerClient.rpc('guest_requests_staff_manage_allowed', {
      p_hotel_id: hotelId,
    })
    if (allowedError || !allowed) {
      return json({ error: 'forbidden' }, 403)
    }

    let email: string
    let password: string
    let department: string | null = null
    let loginUsername: string | null = null

    if (role === 'admin') {
      email = String(body.email ?? '').trim()
      password = String(body.password ?? '')
      if (!email || password.length < 8) {
        return json({ error: 'invalid_input' }, 400)
      }
    } else {
      department = String(body.department ?? '')
      const pin = String(body.pin ?? '')
      loginUsername = normalizeUsername(String(body.username ?? ''))
      if (!['housekeeping', 'reception', 'maintenance'].includes(department) || !loginUsername || !/^\d{6}$/.test(pin)) {
        return json({ error: 'invalid_input' }, 400)
      }
      email = `${loginUsername}@${OPERATOR_EMAIL_DOMAIN}`
      password = pin
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'create_user_failed' }, 400)
    }

    const { error: profileError } = await admin.from('staff_profiles').insert({
      hotel_id: hotelId,
      auth_user_id: created.user.id,
      name,
      role,
      department,
      login_username: loginUsername,
    })
    if (profileError) {
      // don't leave an orphaned auth user behind if the profile insert fails
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: profileError.message }, 400)
    }

    return json({ ok: true }, 200)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown_error' }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
