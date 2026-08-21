import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastStack } from '@/components/toast-stack'
import { cn } from '@/lib/cn'
import { fetchQueue, subscribeToQueue } from '@/lib/staff-api'
import { useToasts } from '@/hooks/use-toasts'
import { useRequestAlerts } from '@/hooks/use-request-alerts'
import { playAlertSound } from '@/lib/beep'
import { RequestRow } from '@/staff/request-row'
import type { QueuedRequest, StaffProfile } from '@/lib/staff-types'

type Tab = 'active' | 'done'

export function RequestQueue({ profile }: { profile: StaffProfile }) {
  const [queue, setQueue] = useState<QueuedRequest[] | null>(null)
  const [tab, setTab] = useState<Tab>('active')
  const [now, setNow] = useState(() => new Date())
  const { toasts, push, dismiss } = useToasts()
  const knownIds = useRef<Set<string> | null>(null)

  const reload = useCallback(async () => {
    const data = await fetchQueue()
    setQueue(data)

    if (knownIds.current === null) {
      knownIds.current = new Set(data.map((r) => r.id))
      return
    }
    for (const request of data) {
      if (!knownIds.current.has(request.id)) {
        knownIds.current.add(request.id)
        push(`Nuova richiesta — Camera ${request.room_number}: ${request.request_types?.name ?? 'richiesta'}`, 'info')
        playAlertSound()
      }
    }
  }, [push])

  useEffect(() => {
    reload()
    const unsubscribe = subscribeToQueue(() => {
      reload()
    })
    return unsubscribe
  }, [reload])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const active = queue?.filter((r) => r.status === 'requested' || r.status === 'in_progress') ?? []
  const done = queue?.filter((r) => r.status === 'completed' || r.status === 'cancelled') ?? []

  const onAlert = useCallback((message: string, tone: 'info' | 'warning') => push(message, tone), [push])
  useRequestAlerts(active, onAlert)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Richieste ospiti</h1>
          <p className="text-sm text-slate-500">Coda condivisa fra housekeeping e reception.</p>
        </div>
      </div>

      <div className="mb-5 flex gap-1 rounded-md bg-slate-100 p-1 sm:w-fit">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
          Richieste attive ({active.length})
        </TabButton>
        <TabButton active={tab === 'done'} onClick={() => setTab('done')}>
          Richieste evase
        </TabButton>
      </div>

      {queue === null ? (
        <p className="text-sm text-slate-500">Caricamento…</p>
      ) : tab === 'active' ? (
        active.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nessuna richiesta in attesa al momento.
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((request) => (
              <RequestRow key={request.id} request={request} now={now} staffId={profile.id} mode="active" />
            ))}
          </div>
        )
      ) : done.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Nessuna richiesta evasa finora.
        </div>
      ) : (
        <div className="space-y-3">
          {done.map((request) => (
            <RequestRow key={request.id} request={request} now={now} staffId={profile.id} mode="done" />
          ))}
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 cursor-pointer whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  )
}
