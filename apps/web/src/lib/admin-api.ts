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
  name_i18n: Record<string, string>
  description: string | null
  description_i18n: Record<string, string>
  allows_quantity: boolean
  available_quantity: number | null
  active: boolean
  sort_order: number
}

export interface RequestCategoryAdmin {
  id: string
  name: string
  name_i18n: Record<string, string>
  department: Department
  active: boolean
}

export async function listMenu(): Promise<{ categories: RequestCategoryAdmin[]; types: RequestTypeAdmin[] }> {
  const [categoriesRes, typesRes] = await Promise.all([
    supabase.from('request_categories').select('id, name, name_i18n, department, active').order('sort_order'),
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

export async function updateRequestCategoryTranslations(id: string, name_i18n: Record<string, string>): Promise<void> {
  const { error } = await supabase.from('request_categories').update({ name_i18n }).eq('id', id)
  if (error) throw error
}

export async function updateRequestTypeTranslations(
  id: string,
  translations: { name_i18n: Record<string, string>; description_i18n: Record<string, string> },
): Promise<void> {
  const { error } = await supabase.from('request_types').update(translations).eq('id', id)
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

export interface DepartmentStat {
  department: Department
  count: number
  avgMinutes: number
}

export interface StatsSummary {
  overallCount: number
  overallAvgMinutes: number | null
  byDepartment: DepartmentStat[]
}

// All-time, computed client-side over every completed row — small enough at
// hotel scale that a dedicated aggregate query/materialized view isn't
// worth the added moving part yet.
export async function fetchCompletionStats(): Promise<StatsSummary> {
  const { data, error } = await supabase
    .from('guest_requests')
    .select('assigned_department, created_at, completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
  if (error) throw error
  const rows = (data ?? []) as { assigned_department: Department; created_at: string; completed_at: string }[]
  if (rows.length === 0) return { overallCount: 0, overallAvgMinutes: null, byDepartment: [] }

  const minutesFor = (r: { created_at: string; completed_at: string }) =>
    (new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / 60_000

  const overallAvgMinutes = rows.reduce((sum, r) => sum + minutesFor(r), 0) / rows.length

  const grouped = new Map<Department, number[]>()
  for (const r of rows) {
    const list = grouped.get(r.assigned_department) ?? []
    list.push(minutesFor(r))
    grouped.set(r.assigned_department, list)
  }
  const byDepartment = Array.from(grouped.entries())
    .map(([department, minutes]) => ({
      department,
      count: minutes.length,
      avgMinutes: minutes.reduce((a, b) => a + b, 0) / minutes.length,
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes)

  return { overallCount: rows.length, overallAvgMinutes, byDepartment }
}

export interface ItemAvailability {
  requestTypeId: string
  name: string
  name_i18n: Record<string, string>
  categoryName: string
  categoryName_i18n: Record<string, string>
  totalQuantity: number
  activeCount: number
  remaining: number
  rooms: string[]
}

// "Remaining" for a trackable item (available_quantity set) = the total
// minus whatever is either still an open request (reserved but not yet
// delivered) or delivered-and-completed but not yet marked returned (see
// 0016_item_return_tracking.sql — returned_at is set explicitly by staff,
// or automatically when the guest's stay ends).
export async function fetchItemAvailability(): Promise<ItemAvailability[]> {
  const { data: types, error: typesError } = await supabase
    .from('request_types')
    .select('id, name, name_i18n, available_quantity, request_categories(name, name_i18n)')
    .not('available_quantity', 'is', null)
    .eq('active', true)
  if (typesError) throw typesError
  const typeList = (types ?? []) as unknown as {
    id: string
    name: string
    name_i18n: Record<string, string>
    available_quantity: number
    request_categories: { name: string; name_i18n: Record<string, string> } | null
  }[]
  if (typeList.length === 0) return []

  const ids = typeList.map((t) => t.id)
  const { data: active, error: activeError } = await supabase
    .from('guest_requests')
    .select('request_type_id, room_number')
    .in('request_type_id', ids)
    .or('status.in.(requested,in_progress),and(status.eq.completed,returned_at.is.null)')
  if (activeError) throw activeError

  const byType = new Map<string, string[]>()
  for (const r of active ?? []) {
    const list = byType.get(r.request_type_id) ?? []
    list.push(r.room_number)
    byType.set(r.request_type_id, list)
  }

  return typeList.map((t) => {
    const rooms = byType.get(t.id) ?? []
    return {
      requestTypeId: t.id,
      name: t.name,
      name_i18n: t.name_i18n,
      categoryName: t.request_categories?.name ?? '',
      categoryName_i18n: t.request_categories?.name_i18n ?? {},
      totalQuantity: t.available_quantity,
      activeCount: rooms.length,
      remaining: Math.max(0, t.available_quantity - rooms.length),
      rooms,
    }
  })
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
