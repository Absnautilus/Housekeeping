import { Link, useLocation } from 'react-router-dom'
import type { SVGProps } from 'react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/cn'
import { signOut } from '@/lib/staff-api'
import type { StaffProfile } from '@/lib/staff-types'

const DEPARTMENT_LABEL: Record<string, string> = {
  reception: 'Reception',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
}

export function DashboardHeader({ profile }: { profile: StaffProfile }) {
  const location = useLocation()
  const roleLabel =
    profile.role === 'master' ? 'Master' : profile.role === 'admin' ? 'Admin' : DEPARTMENT_LABEL[profile.department ?? ''] ?? 'Operatore'
  const isAdminLike = profile.role === 'admin' || profile.role === 'master'

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/staff" className="shrink-0 hover:opacity-80">
          <Logo />
        </Link>

        <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">{roleLabel}</p>
          <p className="truncate font-semibold text-slate-900">{profile.name}</p>
        </div>

        <nav className="flex shrink-0 items-center gap-1">
          <NavLink to="/staff" label="Richieste" icon={IconInbox} active={location.pathname === '/staff'} />
          {(isAdminLike || profile.department === 'reception') && (
            <NavLink to="/staff/soggiorni" label="Soggiorni" icon={IconBed} active={location.pathname.startsWith('/staff/soggiorni')} />
          )}
          {isAdminLike && (
            <NavLink to="/staff/admin" label="Gestione" icon={IconSettings} active={location.pathname.startsWith('/staff/admin')} />
          )}
        </nav>

        <button
          type="button"
          onClick={() => void signOut()}
          title="Esci"
          aria-label="Esci"
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
        >
          <IconExit className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string
  label: string
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element
  active: boolean
}) {
  return (
    <Link
      to={to}
      title={label}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-slate-100 sm:px-3',
        active ? 'bg-purple-50 text-purple-700' : 'text-slate-600',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}

function IconInbox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5.5 5h13L21 12v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6L5.5 5Z" />
    </svg>
  )
}

function IconBed(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 18v-7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7M3 18v2M21 18v2M3 14h18M7 11V9a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

function IconExit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
