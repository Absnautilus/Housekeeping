import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-purple-600 text-white hover:bg-purple-500 disabled:bg-purple-300',
  secondary: 'bg-purple-100 text-purple-800 hover:bg-purple-200 disabled:bg-purple-50 disabled:text-purple-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-300',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  outline: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
}

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed cursor-pointer'

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
