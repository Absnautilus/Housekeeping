import { Link } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { useLocale } from '@/lib/i18n/locale-context'

export function PublicHeader({ onLogout }: { onLogout?: () => void }) {
  const { t } = useLocale()
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-6">
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-3 shadow-sm">
        <Link to="/g" className="flex flex-1 items-center hover:opacity-80">
          <Logo />
        </Link>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-bad-bg hover:text-bad-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
