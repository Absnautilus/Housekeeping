import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { RoomsPage } from '@/staff/admin/rooms-page'
import { OperatorsPage } from '@/staff/admin/operators-page'
import { ItemsPage } from '@/staff/admin/items-page'
import { PmsIntegrationPage } from '@/staff/admin/pms-integration-page'
import { ArchivePage } from '@/staff/admin/archive-page'
import { StatsPage } from '@/staff/admin/stats-page'
import { AvailabilityPage } from '@/staff/admin/availability-page'
import { useLocale } from '@/lib/i18n/locale-context'
import type { StaffProfile } from '@/lib/staff-types'

export function AdminHome({ profile }: { profile: StaffProfile }) {
  const { t } = useLocale()
  const location = useLocation()
  const tabs = [
    { to: '/staff/admin', label: t('staff.admin.tabStaff'), match: (p: string) => p === '/staff/admin' },
    { to: '/staff/admin/camere', label: t('staff.admin.tabRooms'), match: (p: string) => p.startsWith('/staff/admin/camere') },
    { to: '/staff/admin/menu', label: t('staff.admin.tabMenu'), match: (p: string) => p.startsWith('/staff/admin/menu') },
    { to: '/staff/admin/disponibilita', label: t('staff.admin.tabAvailability'), match: (p: string) => p.startsWith('/staff/admin/disponibilita') },
    { to: '/staff/admin/statistiche', label: t('staff.admin.tabStats'), match: (p: string) => p.startsWith('/staff/admin/statistiche') },
    { to: '/staff/admin/archivio', label: t('staff.admin.tabArchive'), match: (p: string) => p.startsWith('/staff/admin/archivio') },
    { to: '/staff/admin/pms', label: t('staff.admin.tabPms'), match: (p: string) => p.startsWith('/staff/admin/pms') },
  ]

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-md bg-surface-2 p-1 sm:w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              tab.match(location.pathname) ? 'bg-white text-foreground shadow-sm' : 'text-muted hover:text-foreground',
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
        <Route path="/disponibilita" element={<AvailabilityPage />} />
        <Route path="/statistiche" element={<StatsPage />} />
        <Route path="/archivio" element={<ArchivePage />} />
        <Route path="/pms" element={<PmsIntegrationPage profile={profile} />} />
      </Routes>
    </div>
  )
}
