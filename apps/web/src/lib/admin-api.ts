import { supabase } from '@/lib/supabase'
import type { StaffDepartment } from '@/lib/types'

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

export interface OperatorSummary {
  id: string
  name: string
  role: 'admin' | 'operatore'
  department: StaffDepartment | null
  active: boolean
}

export async function listStaff(): Promise<OperatorSummary[]> {
  const { data, error } = await supabase.from('staff_profiles').select('id, name, role, department, active').order('name')
  if (error) throw error
  return data ?? []
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('staff_profiles').update({ active }).eq('id', id)
  if (error) throw error
}

export async function createOperator(input: {
  name: string
  email: string
  password: string
  department: StaffDepartment
}): Promise<void> {
  const { error } = await supabase.functions.invoke('create-staff-account', { body: input })
  if (error) throw error
}
