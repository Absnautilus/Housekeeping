export type RequestStatus = 'requested' | 'in_progress' | 'completed' | 'cancelled'
export type Department = 'reception' | 'housekeeping' | 'maintenance' | 'porter'
// An operatore's own department is only ever 'housekeeping' or 'reception'
// (the other two Department values exist for request_categories only).
export type StaffRole = 'admin' | 'operatore'
export type StaffDepartment = Extract<Department, 'housekeeping' | 'reception'>

export interface RequestCategory {
  id: string
  hotel_id: string
  name: string
  department: Department
  icon: string | null
  active: boolean
  sort_order: number
}

export interface RequestType {
  id: string
  category_id: string
  name: string
  description: string | null
  allows_quantity: boolean
  active: boolean
  sort_order: number
}

export interface GuestRequest {
  id: string
  hotel_id: string
  stay_id: string
  room_number: string
  request_type_id: string
  quantity: number | null
  note: string | null
  status: RequestStatus
  assigned_department: Department
  accepted_by: string | null
  created_at: string
  accepted_at: string | null
  completed_at: string | null
}
