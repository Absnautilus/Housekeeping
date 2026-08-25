import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastStack } from '@/components/toast-stack'
import { EmptyState, IconInboxEmpty } from '@/components/empty-state'
import { cn } from '@/lib/cn'
import { fetchQueue, subscribeToQueue } from '@/lib/staff-api'
import { useToasts } from '@/hooks/use-toasts'
import { useRequestAlerts } from '@/hooks/use-request-alerts'
import { playAlertSound } from '@/lib/beep'
import { RequestRow } from '@/staff/request-row'
import { InProgressColumn } from '@/staff/in-progress-column'
import { NewRequestForm } from '@/staff/new-request-form'
import { DEPARTMENTS } from '@/lib/constants'
import { useLocale } from '@/lib/i18n/locale-context'
import { getErrorMessage } from '@/lib/errors'
import type { Department } from '@/lib/types'
import type { QueuedRequest, StaffProfile } from '@/lib/staff-types'

type Tab = 'active' | 'done'
type DepartmentFilter = 'all' | Department

const DONE_PAGE_SIZE = 15

export function RequestQueue({ profile }: { profile: StaffProfile }) {
  const { t } = useLocale()
  const [queue, setQueue] = useState<QueuedRequest[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('active')
  const [department, setDepartment] = useState<DepartmentFilter>('all')
  const [donePage, setDonePage] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const { toasts, push, dismiss } = useToasts()
  const knownIds = useRef<Set<string> | null>(null)

  const canReorder = profile.role === 'admin' || profile.role === 'master' || (profile.role === 'operatore' && profile.department === 'reception')

  const reload = useCallback(async () => {
    try {
      const data = await fetchQueue()
      setLoadError(null)
      setQueue(data)

      if (knownIds.current === null) {
        knownIds.current = new Set(data.map((r) => r.id))
        return
      }
      for (const request of data) {
        if (!knownIds.current.has(request.id)) {
          knownIds.current.add(request.id)
          push(t('staff.queue.newRequestToast', { room: request.room_number, item: request.request_types?.name ?? t('staff.queue.newRequestFallbackItem') }), 'info')
          playAlertSound()
        }
      }
    } catch (err) {
      setLoadError(getErrorMessage(err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    setDonePage(0)
  }, [department])

  const filtered = useMemo(
    () => (department === 'all' ? (queue ?? []) : (queue ?? []).filter((r) => r.assigned_department === department)),
    [queue, department],
  )

  const pending = filtered.filter((r) => r.status === 'requested')
  const inProgress = filtered.filter((r) => r.status === 'in_progress')
  const active = [...pending, ...inProgress]
  const done = useMemo(
    () =>
      filtered
        .filter((r) => r.status === 'completed' || r.status === 'cancelled')
        .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime()),
    [filtered],
  )

  const doneTotalPages = Math.max(1, Math.ceil(done.length / DONE_PAGE_SIZE))
  const clampedDonePage = Math.min(donePage, doneTotalPages - 1)
  const donePageItems = done.slice(clampedDonePage * DONE_PAGE_SIZE, clampedDonePage * DONE_PAGE_SIZE + DONE_PAGE_SIZE)

  const onAlert = useCallback((message: string, tone: 'info' | 'warning') => push(message, tone), [push])
  useRequestAlerts(active, onAlert)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('staff.queue.title')}</h1>
          <p className="text-sm text-muted">{t('staff.queue.subtitle')}</p>
        </div>
        <DepartmentFilterBar value={department} onChange={setDepartment} />
      </div>

      <div className="mb-5">
        <NewRequestForm staffId={profile.id} onCreated={reload} />
      </div>

      <div className="mb-5 flex gap-1 rounded-md bg-surface-2 p-1 sm:w-fit">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
          {t('staff.queue.tabActive')} ({active.length})
        </TabButton>
        <TabButton active={tab === 'done'} onClick={() => setTab('done')}>
          {t('staff.queue.tabDone')}
        </TabButton>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-bad-ink/25 bg-bad-bg p-4 text-sm text-bad-ink">
          {t('staff.queue.loadError', { error: loadError })}
        </div>
      ) : queue === null ? (
        <p className="text-sm text-muted">{t('staff.queue.loading')}</p>
      ) : tab === 'active' ? (
        active.length === 0 ? (
          <EmptyState
            icon={<IconInboxEmpty className="h-6 w-6" />}
            title={t('staff.queue.emptyActiveTitle')}
            description={t('staff.queue.emptyActiveDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-wait-ink/25 bg-wait-bg/60 p-3">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-wait-ink">
                <span className="h-2 w-2 rounded-full bg-wait-ink" />
                {t('staff.queue.columnNew')} ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <p className="px-1 text-sm text-wait-ink/60">{t('staff.queue.emptyNewShort')}</p>
              ) : (
                <div className="space-y-3">
                  {pending.map((request) => (
                    <RequestRow key={request.id} request={request} now={now} staffId={profile.id} mode="active" />
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-prog-ink/25 bg-prog-bg/60 p-3">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-prog-ink">
                <span className="h-2 w-2 rounded-full bg-prog-ink" />
                {t('staff.queue.columnInProgress')} ({inProgress.length})
              </h2>
              {inProgress.length === 0 ? (
                <p className="px-1 text-sm text-prog-ink/60">{t('staff.queue.emptyInProgressShort')}</p>
              ) : (
                <InProgressColumn items={inProgress} now={now} staffId={profile.id} canReorder={canReorder} onReordered={reload} />
              )}
            </div>
          </div>
        )
      ) : done.length === 0 ? (
        <EmptyState icon={<IconInboxEmpty className="h-6 w-6" />} title={t('staff.queue.emptyDoneTitle')} description={t('staff.queue.emptyDoneDesc')} />
      ) : (
        <div className="space-y-3">
          {donePageItems.map((request) => (
            <RequestRow key={request.id} request={request} now={now} staffId={profile.id} mode="done" />
          ))}
          {doneTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={clampedDonePage === 0}
                onClick={() => setDonePage((p) => Math.max(0, p - 1))}
                className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('staff.queue.donePagePrev')}
              </button>
              <span className="text-xs text-muted">{t('staff.queue.donePageLabel', { page: clampedDonePage + 1, total: doneTotalPages })}</span>
              <button
                type="button"
                disabled={clampedDonePage >= doneTotalPages - 1}
                onClick={() => setDonePage((p) => Math.min(doneTotalPages - 1, p + 1))}
                className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('staff.queue.donePageNext')}
              </button>
            </div>
          )}
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function DepartmentFilterBar({ value, onChange }: { value: DepartmentFilter; onChange: (d: DepartmentFilter) => void }) {
  const { t } = useLocale()
  const options: DepartmentFilter[] = ['all', ...DEPARTMENTS]
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === opt ? 'border-accent bg-accent text-white' : 'border-line bg-white text-muted hover:border-accent-soft-line',
          )}
        >
          {opt === 'all' ? t('staff.queue.filterAll') : t(`department.${opt}`)}
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
        active ? 'bg-white text-foreground shadow-sm' : 'text-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
