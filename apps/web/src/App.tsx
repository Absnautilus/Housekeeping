import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestApp } from '@/guest/guest-app'
import { StaffApp } from '@/staff/staff-app'
import { LocaleProvider } from '@/lib/i18n/locale-context'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/g" replace />} />
        <Route
          path="/g/*"
          element={
            <LocaleProvider>
              <GuestApp />
            </LocaleProvider>
          }
        />
        <Route path="/staff/*" element={<StaffApp />} />
      </Routes>
    </BrowserRouter>
  )
}
