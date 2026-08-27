import type { ButtonHTMLAttributes, JSX } from 'react'
import { cn } from '@/lib/cn'

// Matches the suite's icon-btn-comf spec: a 44px circle (the mandatory
// comfortable touch target — see suite Accessibility/Structural tokens),
// no visible label, just aria-label/title.
type Tone = 'neutral' | 'hintPositive' | 'hintCaution' | 'ok' | 'warning' | 'danger'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-foreground/70 hover:bg-line-strong',
  // Action Hierarchy, not one color per verb (suite Decision Log): when
  // Accetta/Rifiuta sit paired and neither is "the" action of the screen,
  // both stay neutral chrome — only the icon glyph carries a tint (green/
  // terracotta). Escalates to a solid tone only if a button is ever the
  // sole isolated decision of its context.
  hintPositive: 'bg-surface text-ok-ink hover:bg-surface-2',
  hintCaution: 'bg-surface text-terracotta-ink hover:bg-surface-2',
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
        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-[0.93] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  )
}
