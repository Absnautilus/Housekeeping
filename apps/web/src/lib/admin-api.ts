import { supabase } from '@/lib/supabase'
import type { Department, StaffDepartment, StaffRole } from '@/lib/types'

export interface Room {
  id: string
  room_number: string
  active: boolean
}

export async function listRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from('rooms').select('id, room_number, active').order('room_number')
  if (error) throw error
  return data ?? []
}

export async function createRoom(roomNumber: string): Promise<void> {
  const { error } = await supabase.from('rooms').insert({ room_number: roomNumber })
  if (error) throw error
}

export async function setRoomActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('rooms').update({ active }).eq('id', id)
  if (error) throw error
}

export interface Hotel {
  id: string
  name: string
}

export async function listHotels(): Promise<Hotel[]> {
  const { data, error } = await supabase.from('hotels').select('id, name').order('name')
  if (error) throw error
  return data ?? []
}

export interface OperatorSummary {
  id: string
  name: string
  role: StaffRole
  department: StaffDepartment | null
  login_username: string | null
  active: boolean
}

export async function listStaff(): Promise<OperatorSummary[]> {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, name, role, department, login_username, active')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('staff_profiles').update({ active }).eq('id', id)
  if (error) throw error
}

export async function createStaffAccount(
  input:
    | { name: string; role: 'admin'; email: string; password: string; hotelId: string }
    | { name: string; role: 'operatore'; username: string; pin: string; department: StaffDepartment; hotelId?: string },
): Promise<void> {
  const { error } = await supabase.functions.invoke('create-staff-account', { body: input })
  if (error) throw error
}

export interface RequestTypeAdmin {
  id: string
  category_id: string
  name: string
  description: string | null
  allows_quantity: boolean
  available_quantity: number | null
  active: boolean
  sort_order: number
}

export interface RequestCategoryAdmin {
  id: string
  name: string
  department: Department
  active: boolean
}

export async function listMenu(): Promise<{ categories: RequestCategoryAdmin[]; types: RequestTypeAdmin[] }> {
  const [categoriesRes, typesRes] = await Promise.all([
    supabase.from('request_categories').select('id, name, department, active').order('sort_order'),
    supabase.from('request_types').select('*').order('sort_order'),
  ])
  if (categoriesRes.error) throw categoriesRes.error
  if (typesRes.error) throw typesRes.error
  return { categories: categoriesRes.data ?? [], types: typesRes.data ?? [] }
}

export async function createRequestCategory(input: { name: string; department: Department }): Promise<void> {
  const { error } = await supabase.from('request_categories').insert({ name: input.name, department: input.department })
  if (error) throw error
}

export async function setRequestCategoryActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('request_categories').update({ active }).eq('id', id)
  if (error) throw error
}

export async function createRequestType(input: {
  categoryId: string
  name: string
  description: string | null
  allowsQuantity: boolean
  availableQuantity: number | null
}): Promise<void> {
  const { error } = await supabase.from('request_types').insert({
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    allows_quantity: input.allowsQuantity,
    available_quantity: input.availableQuantity,
  })
  if (error) throw error
}

export async function setRequestTypeActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('request_types').update({ active }).eq('id', id)
  if (error) throw error
}

export type PmsMode = 'manual' | 'opera'

export interface PmsIntegrationStatus {
  hotel_id: string
  mode: PmsMode
  ohip_hotel_code: string | null
  ohip_enterprise_id: string | null
  ohip_gateway_url: string | null
  has_credentials: boolean
  last_sync_at: string | null
  last_sync_status: 'success' | 'error' | null
  last_sync_error: string | null
}

export async function getPmsIntegrationStatus(hotelId?: string): Promise<PmsIntegrationStatus> {
  const { data, error } = await supabase.rpc('get_pms_integration_status', { p_hotel_id: hotelId ?? null })
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('missing_status')
  return row as PmsIntegrationStatus
}

export async function savePmsIntegration(input: {
  hotelId?: string
  mode: PmsMode
  ohipHotelCode: string
  ohipEnterpriseId: string
  ohipGatewayUrl: string
  ohipClientId: string | null
  ohipClientSecret: string | null
  ohipAppKey: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('save_pms_integration', {
    p_hotel_id: input.hotelId ?? null,
    p_mode: input.mode,
    p_ohip_hotel_code: input.ohipHotelCode || null,
    p_ohip_enterprise_id: input.ohipEnterpriseId || null,
    p_ohip_gateway_url: input.ohipGatewayUrl || null,
    p_ohip_client_id: input.ohipClientId || null,
    p_ohip_client_secret: input.ohipClientSecret || null,
    p_ohip_app_key: input.ohipAppKey || null,
  })
  if (error) throw error
}

export interface PmsSyncResult {
  ok: boolean
  created?: number
  updated?: number
  error?: string
}

export async function triggerPmsSync(hotelId?: string): Promise<PmsSyncResult> {
  const { data, error } = await supabase.functions.invoke('sync-pms-stays', { body: { hotelId } })
  if (error) throw error
  return data as PmsSyncResult
}
