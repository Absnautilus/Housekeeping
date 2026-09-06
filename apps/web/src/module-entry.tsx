import type { SupabaseClient } from '@supabase/supabase-js'
import { LocaleProvider } from '@/lib/i18n/locale-context'
import { UiScaleProvider } from '@/lib/ui-scale-context'
import { configureSupabaseClient } from '@/lib/supabase'
import { StaffApp } from '@/staff/staff-app'
import './embedded.css'

export interface HousekeepingModuleProps {
  supabase: SupabaseClient
  hotelId: string
  basePath?: string
}

/**
 * Embeddable staff-only Housekeeping entry for the Hotsflow shell.
 *
 * The shell owns authentication, property selection and the Supabase client.
 * Guest routes, standalone login and the standalone BrowserRouter remain in
 * App.tsx and are deliberately not mounted here.
 */
export function HousekeepingModule({
  supabase,
  hotelId,
  basePath = '/housekeeping',
}: HousekeepingModuleProps) {
  // This compatibility boundary must run before StaffApp effects or API calls
  // so integrated mode never creates Housekeeping's standalone Supabase client.
  configureSupabaseClient(supabase)

  return (
    <div className="hk-root hk-root--embedded">
      <LocaleProvider>
        <UiScaleProvider>
          <StaffApp mode="embedded" expectedHotelId={hotelId} basePath={basePath} />
        </UiScaleProvider>
      </LocaleProvider>
    </div>
  )
}
