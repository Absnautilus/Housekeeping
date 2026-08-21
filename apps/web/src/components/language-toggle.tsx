import { useEffect, useRef, useState } from 'react'
import { LOCALES } from '@/lib/i18n/locales'
import { useLocale } from '@/lib/i18n/locale-context'
import { FlagIcon } from '@/components/flag-icon'
import { cn } from '@/lib/cn'

export function LanguageToggle() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Lingua"
        aria-expanded={open}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 shadow-sm hover:border-purple-300"
      >
        <FlagIcon code={locale} className="h-7 w-7" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 flex gap-1.5 rounded-full border border-slate-200 bg-white p-1.5 shadow-lg">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code)
                setOpen(false)
              }}
              aria-label={l.label}
              title={l.label}
              className={cn(
                'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110',
                l.code === locale && 'ring-2 ring-purple-500',
              )}
            >
              <FlagIcon code={l.code} className="h-7 w-7" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
