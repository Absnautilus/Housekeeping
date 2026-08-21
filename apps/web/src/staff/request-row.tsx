import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'
import { DEPARTMENT_LABEL } from '@/lib/constants'
import type { Department } from '@/lib/types'
import { formatElapsed, formatTime } from '@/lib/format'
import { cancelRequest, claimRequest, completeRequest, reassignRequest } from '@/lib/staff-api'
import type { QueuedRequest } from '@/lib/staff-types'

export function RequestRow({
  request,
  now,
  staffId,
  mode,
}: {
  request: QueuedRequest
  now: Date
  staffId: string
  mode: 'active' | 'done'
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const typeName = request.request_types?.name ?? 'Richiesta'
  const categoryName = request.request_types?.request_categories?.name

  async function run(action: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await action()
    } catch {
      setError('Operazione non riuscita, riprova.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">
              Camera {request.room_number} <span className="font-normal text-slate-400">·</span> {typeName}
              {request.quantity ? ` × ${request.quantity}` : ''}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {formatTime(request.created_at)}
              {categoryName && ` · ${categoryName}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <Badge>{DEPARTMENT_LABEL[request.assigned_department]}</Badge>
          </div>
        </div>

        {request.note && <p className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-600">{request.note}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400">
            {mode === 'active'
              ? `In attesa da ${formatElapsed(request.created_at, now)}`
              : request.status === 'completed'
                ? `Evasa in ${formatElapsed(request.created_at, new Date(request.completed_at ?? request.created_at))}`
                : 'Annullata'}
          </p>

          {mode === 'active' && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={request.assigned_department}
                disabled={pending}
                onChange={(e) => run(() => reassignRequest(request.id, e.target.value as Department))}
                className="w-auto py-1 text-xs"
              >
                {Object.entries(DEPARTMENT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              {request.status === 'requested' && (
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => claimRequest(request.id, staffId))}>
                  Prendi in carico
                </Button>
              )}
              {request.status === 'in_progress' && (
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => completeRequest(request.id))}>
                  Completa
                </Button>
              )}
              <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => cancelRequest(request.id))}>
                Annulla
              </Button>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </CardBody>
    </Card>
  )
}
