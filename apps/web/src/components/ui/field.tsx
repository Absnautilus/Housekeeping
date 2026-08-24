import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const controlClass =
  'w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-3 focus:ring-accent-soft disabled:bg-surface-2'

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode
  htmlFor?: string
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted">
      {children}
      {required && <span className="text-bad-ink"> *</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClass, props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, 'cursor-pointer', props.className)} />
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null
  return <p className="mt-1 text-[11px] font-semibold text-bad-ink">{children}</p>
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}
