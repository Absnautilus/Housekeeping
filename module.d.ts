import type { JSX } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface HousekeepingModuleProps {
  supabase: SupabaseClient
  hotelId: string
  basePath?: string
}

export declare function HousekeepingModule(props: HousekeepingModuleProps): JSX.Element
