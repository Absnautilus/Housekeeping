import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { RoomsPage } from '@/staff/admin/rooms-page'
import { OperatorsPage } from '@/staff/admin/operators-page'
import { ItemsPage } from '@/staff/admin/items-page'
import type { StaffProfile } from '@/lib/staff-types'

export function AdminHome({ profile }: { profile: StaffProfile }) {
  const location = useLocation()
  const tabs = [
    { to: '/staff/admin', label: 'Staff', match: (p: string) => p === '/staff/admin' },
    { to: '/staff/admin/camere', label: 'Camere', match: (p: string) => p.startsWith('/staff/admin/camere') },
    { to: '/staff/admin/menu', label: 'Menu richieste', match: (p: string) => p.startsWith('/staff/admin/menu') },
  ]

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-md bg-slate-100 p-1 sm:w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              tab.match(location.pathname) ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <Routes>
        <Route path="/" element={<OperatorsPage profile={profile} />} />
        <Route path="/camere" element={<RoomsPage />} />
        <Route path="/menu" element={<ItemsPage />} />
      </Routes>
    </div>
  )
}
