import { useEffect, useRef, useState } from 'react'
import { LOCALES } from '@/lib/i18n/locales'
import { useLocale } from '@/lib/i18n/locale-context'
import { cn } from '@/lib/cn'

export function LanguageToggle() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!

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
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-sm hover:border-purple-300"
      >
        <span aria-hidden>{current.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code)
                setOpen(false)
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50',
                l.code === locale ? 'font-semibold text-purple-700' : 'text-slate-700',
              )}
            >
              <span aria-hidden>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
