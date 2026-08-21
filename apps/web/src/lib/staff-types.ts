import type { GuestRequest, StaffDepartment, StaffRole } from '@/lib/types'

export interface StaffProfile {
  id: string
  hotel_id: string
  auth_user_id: string
  name: string
  role: StaffRole
  department: StaffDepartment | null
  active: boolean
}

export interface QueuedRequest extends GuestRequest {
  request_types: {
    name: string
    allows_quantity: boolean
    request_categories: { name: string } | null
  } | null
  accepted_by_staff: { name: string } | null
}
