import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestApp } from '@/guest/guest-app'
import { StaffApp } from '@/staff/staff-app'
import { LocaleProvider } from '@/lib/i18n/locale-context'
import { UiScaleProvider } from '@/lib/ui-scale-context'

export default function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <UiScaleProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/g" replace />} />
            <Route path="/g/*" element={<GuestApp />} />
            <Route path="/staff/*" element={<StaffApp />} />
          </Routes>
        </UiScaleProvider>
      </LocaleProvider>
    </BrowserRouter>
  )
}
