import { Link } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { useLocale } from '@/lib/i18n/locale-context'

export function PublicHeader({ onLogout }: { onLogout?: () => void }) {
  const { t } = useLocale()
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-6">
      <Link to="/g" className="hover:opacity-80">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-red-300 hover:text-red-600"
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
