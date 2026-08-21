import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestApp } from '@/guest/guest-app'
import { StaffApp } from '@/staff/staff-app'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/g" replace />} />
        <Route path="/g/*" element={<GuestApp />} />
        <Route path="/staff/*" element={<StaffApp />} />
      </Routes>
    </BrowserRouter>
  )
}
