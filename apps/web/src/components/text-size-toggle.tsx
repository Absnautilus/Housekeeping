import { useEffect, useRef, useState } from 'react'
import { UI_SCALES, useUiScale, type UiScale } from '@/lib/ui-scale-context'
import { useLocale } from '@/lib/i18n/locale-context'
import { cn } from '@/lib/cn'

const SCALE_KEY: Record<UiScale, 'uiScale.normal' | 'uiScale.large' | 'uiScale.xlarge'> = {
  normal: 'uiScale.normal',
  large: 'uiScale.large',
  xlarge: 'uiScale.xlarge',
}

const SAMPLE_SIZE: Record<UiScale, string> = {
  normal: 'text-sm',
  large: 'text-base',
  xlarge: 'text-lg',
}

export function TextSizeToggle({ dark = false, align = 'center' }: { dark?: boolean; align?: 'center' | 'right' } = {}) {
  const { t } = useLocale()
  const { scale, setScale } = useUiScale()
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
        aria-label={t('uiScale.label')}
        title={t('uiScale.label')}
        aria-expanded={open}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors',
          dark ? 'hover:bg-white/10' : 'border border-line shadow-sm hover:border-accent-soft-line',
        )}
      >
        <GearIcon className="h-4.5 w-4.5" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-10 mt-2 flex items-end gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-lg',
            align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2',
          )}
        >
          {UI_SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScale(s)
                setOpen(false)
              }}
              aria-label={t(SCALE_KEY[s])}
              title={t(SCALE_KEY[s])}
              className={cn(
                'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full font-bold text-foreground transition-colors hover:bg-surface-2',
                SAMPLE_SIZE[s],
                s === scale && 'bg-accent-soft text-accent ring-2 ring-accent',
              )}
            >
              A
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}
