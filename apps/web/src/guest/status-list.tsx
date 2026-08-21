import { useEffect, useState } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { cancelMyRequest, isInvalidSessionError, listMyRequests } from '@/lib/guest-api'
import type { GuestRequest } from '@/lib/types'

const POLL_INTERVAL_MS = 12_000

export function StatusList({
  token,
  refreshKey,
  onSessionExpired,
}: {
  token: string
  refreshKey: number
  onSessionExpired: () => void
}) {
  const [requests, setRequests] = useState<GuestRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await listMyRequests(token)
        if (!cancelled) setRequests(data)
      } catch (err) {
        if (isInvalidSessionError(err)) {
          onSessionExpired()
          return
        }
        if (!cancelled) setError('Non riusciamo ad aggiornare le tue richieste.')
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [token, refreshKey, onSessionExpired])

  if (error) return <p className="text-center text-sm text-red-600">{error}</p>
  if (!requests) return <p className="text-center text-sm text-slate-500">Caricamento…</p>
  if (requests.length === 0) return <p className="text-center text-sm text-slate-500">Non hai ancora inviato richieste.</p>

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onCancel={async () => {
            try {
              const updated = await cancelMyRequest(token, request.id)
              setRequests((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? null)
            } catch (err) {
              if (isInvalidSessionError(err)) onSessionExpired()
            }
          }}
        />
      ))}
    </div>
  )
}

function RequestCard({ request, onCancel }: { request: GuestRequest; onCancel: () => void }) {
  const time = new Date(request.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return (
    <Card>
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {request.quantity ? `${request.quantity} × ` : ''}
            Richiesta delle {time}
          </p>
          {request.note && <p className="mt-0.5 text-xs text-slate-500">{request.note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={request.status} />
          {request.status === 'requested' && (
            <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-red-600">
              Annulla
            </button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
