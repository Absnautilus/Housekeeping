import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { REQUEST_STATUS, REQUEST_STATUS_LABEL, type RequestStatus } from '@/lib/constants'

const colors: Record<RequestStatus, string> = {
  requested: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
}

export function StatusBadge({ status }: { status: string }) {
  const key = (status in colors ? status : REQUEST_STATUS.REQUESTED) as RequestStatus
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', colors[key])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {REQUEST_STATUS_LABEL[key]}
    </span>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700', className)}>
      {children}
    </span>
  )
}
