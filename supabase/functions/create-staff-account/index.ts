// Creates an operatore account (auth user + staff_profiles row).
// Needs the service_role key (auth.admin.createUser), which must never
// reach the browser — that's the entire reason this runs as an Edge
// Function instead of a client-side insert.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { data: caller, error: callerError } = await callerClient
      .from('staff_profiles')
      .select('id, hotel_id, role, active')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (callerError || !caller || caller.role !== 'admin' || !caller.active) {
      return json({ error: 'forbidden' }, 403)
    }

    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')
    const department = body.department

    if (!name || !email || password.length < 8 || !['housekeeping', 'reception'].includes(department)) {
      return json({ error: 'invalid_input' }, 400)
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
      hotel_id: caller.hotel_id,
      auth_user_id: created.user.id,
      name,
      role: 'operatore',
      department,
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
