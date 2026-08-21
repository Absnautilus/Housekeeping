import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Department } from '@/lib/types'
import type { QueuedRequest, StaffProfile } from '@/lib/staff-types'
import { usernameToEmail } from '@/lib/operator-login'

const QUEUE_SELECT = '*, request_types(name, allows_quantity, request_categories(name))'

export async function fetchMyProfile(): Promise<StaffProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  // RLS lets a master see every staff row at every hotel, and any staff
  // member sees the rest of their own hotel's team — so this can never rely
  // on "RLS happens to return one row" once there's more than one account.
  const { data, error } = await supabase.from('staff_profiles').select('*').eq('auth_user_id', user.id).maybeSingle()
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signInOperator(username: string, pin: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password: pin })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function fetchQueue(): Promise<QueuedRequest[]> {
  const { data, error } = await supabase.from('guest_requests').select(QUEUE_SELECT).order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as QueuedRequest[]
}

export function subscribeToQueue(
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) {
  const channel = supabase
    .channel('guest_requests-queue')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_requests' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function claimRequest(id: string, staffId: string) {
  const { error } = await supabase
    .from('guest_requests')
    .update({ status: 'in_progress', accepted_by: staffId, accepted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'requested')
  if (error) throw error
}

export async function completeRequest(id: string) {
  const { error } = await supabase
    .from('guest_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function cancelRequest(id: string) {
  const { error } = await supabase.from('guest_requests').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
}

export async function reassignRequest(id: string, department: Department) {
  const { error } = await supabase.from('guest_requests').update({ assigned_department: department }).eq('id', id)
  if (error) throw error
}
