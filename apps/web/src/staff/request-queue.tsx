import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastStack } from '@/components/toast-stack'
import { cn } from '@/lib/cn'
import { fetchQueue, subscribeToQueue, swapPriority } from '@/lib/staff-api'
import { useToasts } from '@/hooks/use-toasts'
import { useRequestAlerts } from '@/hooks/use-request-alerts'
import { playAlertSound } from '@/lib/beep'
import { RequestRow } from '@/staff/request-row'
import { DEPARTMENT_LABEL } from '@/lib/constants'
import type { Department } from '@/lib/types'
import type { QueuedRequest, StaffProfile } from '@/lib/staff-types'

type Tab = 'active' | 'done'
type DepartmentFilter = 'all' | Department

export function RequestQueue({ profile }: { profile: StaffProfile }) {
  const [queue, setQueue] = useState<QueuedRequest[] | null>(null)
  const [tab, setTab] = useState<Tab>('active')
  const [department, setDepartment] = useState<DepartmentFilter>('all')
  const [now, setNow] = useState(() => new Date())
  const { toasts, push, dismiss } = useToasts()
  const knownIds = useRef<Set<string> | null>(null)

  const canReorder = profile.role === 'admin' || profile.role === 'master' || (profile.role === 'operatore' && profile.department === 'reception')

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

  const filtered = useMemo(
    () => (department === 'all' ? (queue ?? []) : (queue ?? []).filter((r) => r.assigned_department === department)),
    [queue, department],
  )

  const pending = filtered.filter((r) => r.status === 'requested')
  const inProgress = filtered.filter((r) => r.status === 'in_progress')
  const active = [...pending, ...inProgress]
  const done = filtered.filter((r) => r.status === 'completed' || r.status === 'cancelled')

  const onAlert = useCallback((message: string, tone: 'info' | 'warning') => push(message, tone), [push])
  useRequestAlerts(active, onAlert)

  async function move(index: number, direction: -1 | 1) {
    const other = inProgress[index + direction]
    const current = inProgress[index]
    if (!other || !current) return
    await swapPriority(current, other)
    await reload()
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Richieste ospiti</h1>
          <p className="text-sm text-slate-500">Coda condivisa fra housekeeping e reception.</p>
        </div>
        <DepartmentFilterBar value={department} onChange={setDepartment} />
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-500">Nuove ({pending.length})</h2>
              {pending.length === 0 ? (
                <p className="text-sm text-slate-400">Nessuna richiesta da prendere in carico.</p>
              ) : (
                <div className="space-y-3">
                  {pending.map((request) => (
                    <RequestRow key={request.id} request={request} now={now} staffId={profile.id} mode="active" />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-500">Prese in carico ({inProgress.length})</h2>
              {inProgress.length === 0 ? (
                <p className="text-sm text-slate-400">Nessuna richiesta al momento in carico.</p>
              ) : (
                <div className="space-y-3">
                  {inProgress.map((request, i) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      now={now}
                      staffId={profile.id}
                      mode="active"
                      canReorder={canReorder}
                      onMoveUp={i > 0 ? () => move(i, -1) : undefined}
                      onMoveDown={i < inProgress.length - 1 ? () => move(i, 1) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
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

function DepartmentFilterBar({ value, onChange }: { value: DepartmentFilter; onChange: (d: DepartmentFilter) => void }) {
  const options: DepartmentFilter[] = ['all', 'reception', 'housekeeping', 'maintenance', 'porter']
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === opt ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300',
          )}
        >
          {opt === 'all' ? 'Tutti' : DEPARTMENT_LABEL[opt]}
        </button>
      ))}
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
