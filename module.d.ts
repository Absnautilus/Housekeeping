import type { JSX } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface HousekeepingCapabilities {
  staysView: boolean
  manage: boolean
}

export interface PlatformStaffManagementLink {
  href: string
  label: string
  description: string
}

export interface PlatformHotelSettings {
  checkInTime: string | null
  checkOutTime: string | null
}

export interface HousekeepingModuleProps {
  supabase: SupabaseClient
  hotelId: string
  basePath?: string
  capabilities?: HousekeepingCapabilities
  platformStaffManagement?: PlatformStaffManagementLink
  hotelSettings?: PlatformHotelSettings
}

export declare function HousekeepingModule(props: HousekeepingModuleProps): JSX.Element
