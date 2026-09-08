import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCreateStaffAccountHandler } from './handler.ts'

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
}

function harness(options = {}) {
  const calls = { rpcs: [], serviceClients: 0, createUsers: 0, inserts: 0 }
  const callerClient = {
    auth: { getUser: async () => ({ data: { user: options.user === null ? null : { id: 'caller-1' } } }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: options.caller === null ? null : { id: 'staff-1', hotel_id: 'hotel-1' },
          error: options.callerError ?? null,
        }),
      }
      return builder
    },
    rpc: async (name) => {
      calls.rpcs.push(name)
      if (name === 'current_staff_is_master') return { data: false, error: options.orgWideError ?? null }
      if (name === 'legacy_hotel_is_embedded') return { data: options.embedded ?? false, error: options.embeddedError ?? null }
      if (name === 'guest_requests_staff_manage_allowed') return { data: options.allowed ?? true, error: options.allowedError ?? null }
      throw new Error(`unexpected RPC ${name}`)
    },
  }
  const adminClient = {
    auth: { admin: {
      createUser: async () => { calls.createUsers += 1; return { data: { user: { id: 'created-1' } }, error: null } },
      deleteUser: async () => ({ error: null }),
    } },
    from: () => ({ insert: async () => { calls.inserts += 1; return { error: null } } }),
  }
  const handler = createCreateStaffAccountHandler({
    createClient: (_url, key) => {
      if (key === 'service-key') { calls.serviceClients += 1; return adminClient }
      return callerClient
    },
    getEnv: (name) => env[name],
  })
  return { handler, calls }
}

function request(body = { name: 'Mario' }, authorized = true) {
  return new Request('https://example.test/create-staff-account', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: 'Bearer token' } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function responseBody(response) { return response.json() }

describe('create-staff-account authorization boundary', () => {
  it('returns 401 without authorization and creates no privileged client', async () => {
    const { handler, calls } = harness()
    const response = await handler(request(undefined, false))
    assert.equal(response.status, 401)
    assert.deepEqual(await responseBody(response), { error: 'missing_authorization' })
    assert.equal(calls.serviceClients, 0)
  })

  it('returns 401 for an invalid session', async () => {
    const { handler, calls } = harness({ user: null })
    const response = await handler(request())
    assert.equal(response.status, 401)
    assert.equal(calls.serviceClients, 0)
  })

  it('returns 409 for an embedded hotel before authorization or privileged operations', async () => {
    const { handler, calls } = harness({ embedded: true })
    const response = await handler(request())
    assert.equal(response.status, 409)
    assert.deepEqual(await responseBody(response), { error: 'hotel_managed_by_hotsflow_team' })
    assert.deepEqual(calls.rpcs, ['current_staff_is_master', 'legacy_hotel_is_embedded'])
    assert.equal(calls.serviceClients, 0)
    assert.equal(calls.createUsers, 0)
  })

  it('fails closed when the embedding RPC errors', async () => {
    const { handler, calls } = harness({ embeddedError: { message: 'RPC unavailable' } })
    const response = await handler(request())
    assert.equal(response.status, 403)
    assert.deepEqual(calls.rpcs, ['current_staff_is_master', 'legacy_hotel_is_embedded'])
    assert.equal(calls.serviceClients, 0)
  })

  it('returns 403 when staff management is unauthorized', async () => {
    const { handler, calls } = harness({ allowed: false })
    const response = await handler(request())
    assert.equal(response.status, 403)
    assert.deepEqual(calls.rpcs, [
      'current_staff_is_master', 'legacy_hotel_is_embedded', 'guest_requests_staff_manage_allowed',
    ])
    assert.equal(calls.serviceClients, 0)
  })

  it('preserves standalone account creation after all checks pass', async () => {
    const { handler, calls } = harness()
    const response = await handler(request({
      name: 'Mario', department: 'housekeeping', username: ' Mario ', pin: '123456',
    }))
    assert.equal(response.status, 200)
    assert.deepEqual(await responseBody(response), { ok: true })
    assert.equal(calls.serviceClients, 1)
    assert.equal(calls.createUsers, 1)
    assert.equal(calls.inserts, 1)
  })
})
