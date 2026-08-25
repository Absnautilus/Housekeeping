import { supabase } from '@/lib/supabase'
import type { Room } from '@/lib/admin-api'
import type { Department } from '@/lib/types'

export interface Stay {
  id: string
  room_id: string
  guest_last_name: string
  guest_pin: string
  check_in_at: string
  check_out_at: string
  status: 'active' | 'closed' | 'cancelled'
  rooms: Pick<Room, 'room_number'> | null
}

export async function listStays(): Promise<Stay[]> {
  const { data, error } = await supabase
    .from('stays')
    .select('id, room_id, guest_last_name, guest_pin, check_in_at, check_out_at, status, rooms(room_number)')
    .eq('status', 'active')
    .order('check_in_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Stay[]
}

export async function createStay(input: {
  roomId: string
  guestLastName: string
  checkInAt: string
  checkOutAt: string
}): Promise<Stay> {
  const { data, error } = await supabase
    .from('stays')
    .insert({
      room_id: input.roomId,
      guest_last_name: input.guestLastName,
      check_in_at: input.checkInAt,
      check_out_at: input.checkOutAt,
    })
    .select('id, room_id, guest_last_name, guest_pin, check_in_at, check_out_at, status, rooms(room_number)')
    .single()
  if (error) throw error
  return data as unknown as Stay
}

export async function updateCheckout(id: string, checkOutAt: string): Promise<void> {
  const { error } = await supabase.from('stays').update({ check_out_at: checkOutAt }).eq('id', id)
  if (error) throw error
}

export async function cancelStay(id: string): Promise<void> {
  const { error } = await supabase.from('stays').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
}

export interface StayRequest {
  id: string
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  completed_at: string | null
  assigned_department: Department
  request_types: { name: string; name_i18n: Record<string, string> } | null
}

export async function fetchRequestsForStay(stayId: string): Promise<StayRequest[]> {
  const { data, error } = await supabase
    .from('guest_requests')
    .select('id, status, created_at, completed_at, assigned_department, request_types(name, name_i18n)')
    .eq('stay_id', stayId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as StayRequest[]
}
