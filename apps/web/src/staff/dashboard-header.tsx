import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/cn'
import { signOut } from '@/lib/staff-api'
import type { StaffProfile } from '@/lib/staff-types'

const DEPARTMENT_LABEL: Record<string, string> = {
  reception: 'Reception',
  housekeeping: 'Housekeeping',
}

export function DashboardHeader({ profile }: { profile: StaffProfile }) {
  const location = useLocation()
  const roleLabel = profile.role === 'admin' ? 'Admin' : DEPARTMENT_LABEL[profile.department ?? ''] ?? 'Operatore'

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/staff" className="shrink-0 border-r border-slate-200 pr-4 hover:opacity-80">
          <Logo />
        </Link>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">{roleLabel}</p>
          <p className="font-semibold text-slate-900">{profile.name}</p>
        </div>
        <nav className="flex gap-1">
          <NavLink to="/staff" label="Richieste" active={location.pathname === '/staff'} />
          {(profile.role === 'admin' || profile.department === 'reception') && (
            <NavLink to="/staff/soggiorni" label="Soggiorni" active={location.pathname.startsWith('/staff/soggiorni')} />
          )}
          {profile.role === 'admin' && (
            <NavLink to="/staff/admin" label="Gestione" active={location.pathname.startsWith('/staff/admin')} />
          )}
        </nav>
        <button type="button" onClick={() => void signOut()} className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-900">
          Esci
        </button>
      </div>
    </header>
  )
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn('rounded-md px-3 py-1.5 text-sm font-medium hover:bg-slate-100', active ? 'text-purple-700' : 'text-slate-600')}
    >
      {label}
    </Link>
  )
}
