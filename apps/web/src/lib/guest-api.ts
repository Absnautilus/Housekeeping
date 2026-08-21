import { supabase } from '@/lib/supabase'
import { HOTEL_ID } from '@/lib/env'
import type { GuestRequest, RequestCategory, RequestType } from '@/lib/types'

export function isInvalidSessionError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('invalid_session')
}

export async function guestLogin(roomNumber: string, lastName: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('guest_login', {
    p_hotel_id: HOTEL_ID,
    p_room_number: roomNumber,
    p_last_name: lastName,
  })
  if (error) throw error
  return data
}

export async function fetchMenu(): Promise<{ categories: RequestCategory[]; types: RequestType[] }> {
  const [categoriesRes, typesRes] = await Promise.all([
    supabase.from('request_categories').select('*').order('sort_order'),
    supabase.from('request_types').select('*').order('sort_order'),
  ])
  if (categoriesRes.error) throw categoriesRes.error
  if (typesRes.error) throw typesRes.error
  return { categories: categoriesRes.data ?? [], types: typesRes.data ?? [] }
}

export async function createGuestRequest(
  token: string,
  requestTypeId: string,
  quantity: number | null,
  note: string | null,
): Promise<GuestRequest> {
  const { data, error } = await supabase.rpc('create_guest_request', {
    p_token: token,
    p_request_type_id: requestTypeId,
    p_quantity: quantity,
    p_note: note,
  })
  if (error) throw error
  return data
}

export async function listMyRequests(token: string): Promise<GuestRequest[]> {
  const { data, error } = await supabase.rpc('list_my_requests', { p_token: token })
  if (error) throw error
  return data ?? []
}

export interface StayInfo {
  room_number: string
  guest_last_name: string
  check_out_at: string
}

export async function getStayInfo(token: string): Promise<StayInfo | null> {
  const { data, error } = await supabase.rpc('guest_stay_info', { p_token: token })
  if (error) throw error
  return data?.[0] ?? null
}

export async function cancelMyRequest(token: string, requestId: string): Promise<GuestRequest> {
  const { data, error } = await supabase.rpc('cancel_my_request', {
    p_token: token,
    p_request_id: requestId,
  })
  if (error) throw error
  return data
}
