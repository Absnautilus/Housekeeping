// Creates a staff account (auth user + staff_profiles row): an admin for a
// hotel or an operatore. Embedded properties must create identities through
// Hotsflow Team instead; this handler therefore depends on the shared Core
// RPC legacy_hotel_is_embedded(). The legacy Housekeeping backend is frozen
// and does not own that RPC. RPC errors are intentionally fail-closed.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPERATOR_EMAIL_DOMAIN = 'staff.local'

type ClientFactory = (url: string, key: string, options?: Record<string, unknown>) => any

export interface CreateStaffAccountDependencies {
  createClient: ClientFactory
  getEnv(name: string): string | undefined
}

export function createCreateStaffAccountHandler({ createClient, getEnv }: CreateStaffAccountDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return json({ error: 'missing_authorization' }, 401)

      const supabaseUrl = requiredEnv(getEnv, 'SUPABASE_URL')
      const anonKey = requiredEnv(getEnv, 'SUPABASE_ANON_KEY')
      const serviceRoleKey = requiredEnv(getEnv, 'SUPABASE_SERVICE_ROLE_KEY')
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })

      const { data: { user } } = await callerClient.auth.getUser()
      if (!user) return json({ error: 'invalid_session' }, 401)

      const { data: caller, error: callerError } = await callerClient
        .from('staff_profiles')
        .select('id, hotel_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (callerError || !caller) return json({ error: 'forbidden' }, 403)

      const { data: isOrgWide, error: orgWideError } = await callerClient.rpc('current_staff_is_master')
      if (orgWideError) return json({ error: 'forbidden' }, 403)

      const body = await req.json()
      const name = String(body.name ?? '').trim()
      const requestedRole = body.role === 'admin' ? 'admin' : 'operatore'
      const role: 'admin' | 'operatore' = isOrgWide ? requestedRole : 'operatore'
      const hotelId = isOrgWide ? String(body.hotelId ?? '') : caller.hotel_id
      if (!name || !hotelId) return json({ error: 'invalid_input' }, 400)

      // This read-only Core check must happen before authorization and before
      // constructing any service-role client. A mapped hotel can only be
      // managed by Hotsflow Team, even when the caller has staff permission.
      const { data: embedded, error: embeddedError } = await callerClient.rpc('legacy_hotel_is_embedded', {
        p_hotel_id: hotelId,
      })
      if (embeddedError) return json({ error: 'forbidden' }, 403)
      if (embedded) return json({ error: 'hotel_managed_by_hotsflow_team' }, 409)

      const { data: allowed, error: allowedError } = await callerClient.rpc('guest_requests_staff_manage_allowed', {
        p_hotel_id: hotelId,
      })
      if (allowedError || !allowed) return json({ error: 'forbidden' }, 403)

      let email: string
      let password: string
      let department: string | null = null
      let loginUsername: string | null = null

      if (role === 'admin') {
        email = String(body.email ?? '').trim()
        password = String(body.password ?? '')
        if (!email || password.length < 8) return json({ error: 'invalid_input' }, 400)
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
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: profileError.message }, 400)
      }

      return json({ ok: true }, 200)
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'unknown_error' }, 500)
    }
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, '')
}

function requiredEnv(getEnv: CreateStaffAccountDependencies['getEnv'], name: string): string {
  const value = getEnv(name)
  if (!value) throw new Error(`missing_${name.toLowerCase()}`)
  return value
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
