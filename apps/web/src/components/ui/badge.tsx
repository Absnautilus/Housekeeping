import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { REQUEST_STATUS, REQUEST_STATUS_LABEL, type RequestStatus } from '@/lib/constants'

const colors: Record<RequestStatus, string> = {
  requested: 'bg-wait-bg text-wait-ink',
  in_progress: 'bg-prog-bg text-prog-ink',
  completed: 'bg-done-bg text-done-ink',
  cancelled: 'bg-off-bg text-off-ink',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = (status in colors ? status : REQUEST_STATUS.REQUESTED) as RequestStatus
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide', colors[key])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? REQUEST_STATUS_LABEL[key]}
    </span>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-foreground/70', className)}>
      {children}
    </span>
  )
}
