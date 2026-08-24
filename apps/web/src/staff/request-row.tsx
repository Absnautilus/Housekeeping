import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'
import { Avatar } from '@/components/avatar'
import { AutoText } from '@/components/auto-text'
import { DEPARTMENTS } from '@/lib/constants'
import type { Department } from '@/lib/types'
import { formatElapsed, formatTime } from '@/lib/format'
import { cancelRequest, claimRequest, completeRequest, reassignRequest } from '@/lib/staff-api'
import type { QueuedRequest } from '@/lib/staff-types'
import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/lib/i18n/locale-context'

export function RequestRow({
  request,
  now,
  staffId,
  mode,
  canReorder = false,
  onMoveUp,
  onMoveDown,
  onDragHandlePointerDown,
  onDragHandlePointerMove,
  onDragHandlePointerUp,
}: {
  request: QueuedRequest
  now: Date
  staffId: string
  mode: 'active' | 'done'
  canReorder?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDragHandlePointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onDragHandlePointerMove?: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onDragHandlePointerUp?: (e: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  const { t } = useLocale()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, confirm] = useConfirm()
  const typeName = request.request_types?.name ?? t('staff.row.defaultTypeName')
  const categoryName = request.request_types?.request_categories?.name

  async function run(action: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await action()
    } catch {
      setError(t('staff.row.opFailed'))
    } finally {
      setPending(false)
    }
  }

  async function onCancel() {
    const ok = await confirm({
      title: t('staff.row.cancelTitle'),
      description: t('staff.row.cancelDesc', { room: request.room_number, type: typeName }),
      confirmLabel: t('staff.row.cancelConfirm'),
    })
    if (ok) run(() => cancelRequest(request.id))
  }

  const elapsedLabel =
    mode !== 'active'
      ? request.status === 'completed'
        ? t('staff.row.resolvedIn', { time: formatElapsed(request.created_at, new Date(request.completed_at ?? request.created_at)) })
        : t('staff.row.cancelledLabel')
      : request.status === 'in_progress' && request.accepted_at
        ? t('staff.row.inChargeSince', { time: formatElapsed(request.accepted_at, now) })
        : t('staff.row.waitingSince', { time: formatElapsed(request.created_at, now) })

  return (
    <Card>
      {confirmDialog}
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {t('staff.newRequest.room')} {request.room_number} <span className="font-normal text-muted">·</span>{' '}
              <AutoText text={typeName} />
              {request.quantity ? ` × ${request.quantity}` : ''}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {formatTime(request.created_at)}
              {categoryName && (
                <>
                  {' · '}
                  <AutoText text={categoryName} />
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {request.accepted_by_staff && <Avatar name={request.accepted_by_staff.name} />}
            <StatusBadge status={request.status} label={t(`statusLabel.${request.status}` as const)} />
            <Badge>{t(`department.${request.assigned_department}`)}</Badge>
          </div>
        </div>

        {request.note && <p className="mt-2 rounded-md bg-surface-2 p-2 text-sm text-muted">{request.note}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            {canReorder && mode === 'active' && request.status === 'in_progress' && (
              <>
                {onDragHandlePointerDown && (
                  <button
                    type="button"
                    onPointerDown={onDragHandlePointerDown}
                    onPointerMove={onDragHandlePointerMove}
                    onPointerUp={onDragHandlePointerUp}
                    onPointerCancel={onDragHandlePointerUp}
                    aria-label={t('staff.row.drag')}
                    title={t('staff.row.drag')}
                    className="flex touch-none cursor-grab items-center justify-center text-muted hover:text-accent active:cursor-grabbing"
                  >
                    <DragHandleIcon className="h-4 w-4" />
                  </button>
                )}
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={!onMoveUp}
                    onClick={onMoveUp}
                    aria-label={t('staff.row.moveUp')}
                    className="cursor-pointer leading-none text-muted hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={!onMoveDown}
                    onClick={onMoveDown}
                    aria-label={t('staff.row.moveDown')}
                    className="cursor-pointer leading-none text-muted hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              </>
            )}
            <p className="text-xs text-muted">{elapsedLabel}</p>
          </div>

          {mode === 'active' && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={request.assigned_department}
                disabled={pending}
                onChange={(e) => run(() => reassignRequest(request.id, e.target.value as Department))}
                className="w-auto py-1 text-xs"
              >
                {DEPARTMENTS.map((value) => (
                  <option key={value} value={value}>
                    {t(`department.${value}`)}
                  </option>
                ))}
              </Select>
              {request.status === 'requested' && (
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => claimRequest(request.id, staffId))}>
                  {t('staff.row.claim')}
                </Button>
              )}
              {request.status === 'in_progress' && (
                <Button size="sm" variant="success" disabled={pending} onClick={() => run(() => completeRequest(request.id))}>
                  {t('staff.row.complete')}
                </Button>
              )}
              <Button size="sm" variant="danger" disabled={pending} onClick={onCancel}>
                {t('staff.row.cancel')}
              </Button>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-bad-ink">{error}</p>}
      </CardBody>
    </Card>
  )
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  )
}
