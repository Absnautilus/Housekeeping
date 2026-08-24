import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-[1.06] disabled:opacity-40',
  secondary: 'bg-accent-soft text-accent hover:bg-accent-soft-line disabled:opacity-40',
  success: 'bg-ok-ink text-white hover:brightness-110 disabled:opacity-40',
  danger: 'bg-bad-bg text-bad-ink border border-bad-ink/25 hover:bg-bad-ink/15 disabled:opacity-40',
  ghost: 'bg-transparent text-foreground/70 hover:bg-surface-2',
  outline: 'bg-surface text-foreground/70 border border-line-strong hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4.5 py-2.5 text-sm',
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-sm font-bold font-head transition-all disabled:cursor-not-allowed cursor-pointer'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  )
}
