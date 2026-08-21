import { supabase } from '@/lib/supabase'
import type { StaffDepartment, StaffRole } from '@/lib/types'

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
}

export async function listMenu(): Promise<{ categories: RequestCategoryAdmin[]; types: RequestTypeAdmin[] }> {
  const [categoriesRes, typesRes] = await Promise.all([
    supabase.from('request_categories').select('id, name').order('sort_order'),
    supabase.from('request_types').select('*').order('sort_order'),
  ])
  if (categoriesRes.error) throw categoriesRes.error
  if (typesRes.error) throw typesRes.error
  return { categories: categoriesRes.data ?? [], types: typesRes.data ?? [] }
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
