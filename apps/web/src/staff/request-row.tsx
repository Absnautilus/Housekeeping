import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { IconButton } from '@/components/ui/icon-button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'
import { IconCheck, IconClaim, IconReturn, IconTrash, IconUndo, IconX } from '@/components/ui/action-icons'
import { Avatar } from '@/components/avatar'
import { AutoText } from '@/components/auto-text'
import { DEPARTMENTS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { Department } from '@/lib/types'
import { formatElapsed, formatTime } from '@/lib/format'
import { cancelRequest, claimRequest, completeRequest, deleteRequest, markItemReturned, reassignRequest, revertRequest } from '@/lib/staff-api'
import type { QueuedRequest } from '@/lib/staff-types'
import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/lib/i18n/locale-context'

// Buttons, the Select trigger, and its open option list all need normal
// clicks to keep working even though the card around them is a drag
// surface — this is what tells a pointerdown on one of those apart from a
// pointerdown on blank card space that should start a drag.
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, select, a, input, textarea, [role="listbox"], [role="option"]') !== null
}

export function RequestRow({
  request,
  now,
  staffId,
  mode,
  canReorder = false,
  onMoveUp,
  onMoveDown,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
}: {
  request: QueuedRequest
  now: Date
  staffId: string
  mode: 'active' | 'done'
  canReorder?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDragPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onDragPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onDragPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const { t } = useLocale()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, confirm] = useConfirm()
  const typeName = request.request_types?.name ?? t('staff.row.defaultTypeName')
  const typeNameI18n = request.request_types?.name_i18n
  const categoryName = request.request_types?.request_categories?.name
  const categoryNameI18n = request.request_types?.request_categories?.name_i18n
  const trackable = request.request_types?.available_quantity != null

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

  async function onDelete() {
    const ok = await confirm({
      title: t('staff.row.deleteTitle'),
      description: t('staff.row.deleteDesc', { room: request.room_number, type: typeName }),
      confirmLabel: t('staff.row.deleteConfirm'),
    })
    if (ok) run(() => deleteRequest(request.id))
  }

  const elapsedLabel =
    mode !== 'active'
      ? request.status === 'completed'
        ? t('staff.row.resolvedIn', { time: formatElapsed(request.created_at, new Date(request.completed_at ?? request.created_at)) })
        : t('staff.row.cancelledLabel')
      : request.status === 'in_progress' && request.accepted_at
        ? t('staff.row.inChargeSince', { time: formatElapsed(request.accepted_at, now) })
        : t('staff.row.waitingSince', { time: formatElapsed(request.created_at, now) })

  const draggable = canReorder && mode === 'active' && request.status === 'in_progress' && Boolean(onDragPointerDown)

  return (
    <Card
      onPointerDown={
        draggable
          ? (e) => {
              if (isInteractiveTarget(e.target)) return
              onDragPointerDown?.(e)
            }
          : undefined
      }
      onPointerMove={draggable ? onDragPointerMove : undefined}
      onPointerUp={draggable ? onDragPointerUp : undefined}
      onPointerCancel={draggable ? onDragPointerUp : undefined}
      className={cn(draggable && 'touch-none cursor-grab select-none transition-shadow hover:shadow-md active:cursor-grabbing')}
      aria-roledescription={draggable ? t('staff.row.drag') : undefined}
    >
      {confirmDialog}
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {t('staff.newRequest.room')} {request.room_number} <span className="font-normal text-muted">·</span>{' '}
              <AutoText text={typeName} translations={typeNameI18n} />
              {request.quantity ? ` × ${request.quantity}` : ''}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {formatTime(request.created_at)}
              {categoryName && (
                <>
                  {' · '}
                  <AutoText text={categoryName} translations={categoryNameI18n} />
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
            )}
            <p className="text-xs text-muted">{elapsedLabel}</p>
            {mode === 'done' && trackable && request.status === 'completed' && (
              <Badge className={request.returned_at ? 'bg-ok-bg text-ok-ink' : 'bg-wait-bg text-wait-ink'}>
                {request.returned_at ? t('staff.row.returned') : t('staff.row.notReturned')}
              </Badge>
            )}
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
                <IconButton tone="accent" icon={IconClaim} label={t('staff.row.claim')} disabled={pending} onClick={() => run(() => claimRequest(request.id, staffId))} />
              )}
              {request.status === 'in_progress' && (
                <IconButton tone="neutral" icon={IconUndo} label={t('staff.row.revert')} disabled={pending} onClick={() => run(() => revertRequest(request.id, 'in_progress'))} />
              )}
              {request.status === 'in_progress' && (
                <IconButton tone="ok" icon={IconCheck} label={t('staff.row.complete')} disabled={pending} onClick={() => run(() => completeRequest(request.id))} />
              )}
              <IconButton tone="warning" icon={IconX} label={t('staff.row.cancel')} disabled={pending} onClick={onCancel} />
            </div>
          )}

          {mode === 'done' && (
            <div className="flex flex-wrap items-center gap-2">
              {trackable && request.status === 'completed' && !request.returned_at && (
                <IconButton tone="ok" icon={IconReturn} label={t('staff.row.markReturned')} disabled={pending} onClick={() => run(() => markItemReturned(request.id))} />
              )}
              <IconButton
                tone="neutral"
                icon={IconUndo}
                label={t('staff.row.revert')}
                disabled={pending}
                onClick={() => run(() => revertRequest(request.id, request.status === 'completed' ? 'completed' : 'cancelled'))}
              />
              <IconButton tone="danger" icon={IconTrash} label={t('staff.row.delete')} disabled={pending} onClick={onDelete} />
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-bad-ink">{error}</p>}
      </CardBody>
    </Card>
  )
}
