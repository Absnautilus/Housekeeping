import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env'

let injectedClient: SupabaseClient | null = null
let standaloneClient: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (injectedClient) return injectedClient
  standaloneClient ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return standaloneClient
}

/**
 * Integrated Hotsflow mode injects CoreClient.raw here before rendering the
 * module. Standalone mode never calls this and lazily creates its historical
 * local client instead.
 */
export function configureSupabaseClient(client: SupabaseClient): void {
  injectedClient = client
}

export function clearInjectedSupabaseClient(): void {
  injectedClient = null
}

// Keep the existing call sites unchanged while avoiding a second Supabase
// client in integrated mode. Property reads (auth/functions/etc.) and methods
// (from/rpc/channel/etc.) are forwarded to whichever client is active.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
