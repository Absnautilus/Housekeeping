import type { ButtonHTMLAttributes, JSX } from 'react'
import { cn } from '@/lib/cn'

// Matches the suite's icon-btn-* spec exactly: a 36px circle, color by
// severity, no visible label — just aria-label/title, for compact rows
// where a labeled button wouldn't fit (or, per the suite's own reasoning,
// wouldn't need to: an icon this consistent reads on its own).
type Tone = 'neutral' | 'accent' | 'ok' | 'warning' | 'danger'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-foreground/70 hover:bg-line-strong',
  // Solid, same visual weight as ok/warning/danger below — the accept
  // action on a not-yet-claimed request should read as a filled "primary"
  // affirmative action, not a soft/muted one like the plain accent color
  // used elsewhere for less committal actions.
  accent: 'bg-accent text-accent-ink hover:brightness-110',
  ok: 'bg-ok-ink text-white hover:brightness-110',
  warning: 'bg-wait-ink text-white hover:brightness-110',
  danger: 'bg-bad-ink text-white hover:brightness-110',
}

export function IconButton({
  tone,
  label,
  icon: Icon,
  className,
  ...props
}: {
  tone: Tone
  label: string
  icon: (props: { className?: string }) => JSX.Element
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-[0.93] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
