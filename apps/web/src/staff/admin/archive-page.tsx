import { useEffect, useState } from 'react'
import { EmptyState, IconInboxEmpty } from '@/components/empty-state'
import { StatusBadge } from '@/components/ui/badge'
import { AutoText } from '@/components/auto-text'
import { fetchArchivedRequests } from '@/lib/staff-api'
import { formatElapsed, formatTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useLocale } from '@/lib/i18n/locale-context'
import type { QueuedRequest } from '@/lib/staff-types'

const PAGE_SIZE = 15

export function ArchivePage() {
  const { t } = useLocale()
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<QueuedRequest[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(null)
    fetchArchivedRequests(page)
      .then(({ items, total }) => {
        setItems(items)
        setTotal(total)
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('staff.archive.title')}</h1>
        <p className="text-sm text-muted">{t('staff.archive.subtitle')}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-bad-ink/25 bg-bad-bg p-4 text-sm text-bad-ink">
          {t('staff.archive.loadError', { error })}
        </div>
      ) : items === null ? (
        <p className="text-sm text-muted">{t('staff.archive.loading')}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<IconInboxEmpty className="h-6 w-6" />} title={t('staff.archive.emptyTitle')} description={t('staff.archive.emptyDesc')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2">{t('staff.archive.colRoom')}</th>
                  <th className="px-4 py-2">{t('staff.archive.colItem')}</th>
                  <th className="px-4 py-2">{t('staff.archive.colDepartment')}</th>
                  <th className="px-4 py-2">{t('staff.archive.colStatus')}</th>
                  <th className="px-4 py-2">{t('staff.archive.colCreated')}</th>
                  <th className="px-4 py-2">{t('staff.archive.colDuration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium text-foreground">{r.room_number}</td>
                    <td className="px-4 py-2 text-muted">
                      <AutoText text={r.request_types?.name ?? t('staff.row.defaultTypeName')} translations={r.request_types?.name_i18n} />
                    </td>
                    <td className="px-4 py-2 text-muted">{t(`department.${r.assigned_department}` as const)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} label={t(`statusLabel.${r.status}` as const)} />
                    </td>
                    <td className="px-4 py-2 text-muted">{formatTime(r.created_at)}</td>
                    <td className="px-4 py-2 text-muted">
                      {r.status === 'completed' && r.completed_at ? formatElapsed(r.created_at, new Date(r.completed_at)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('staff.queue.donePagePrev')}
              </button>
              <span className="text-xs text-muted">{t('staff.queue.donePageLabel', { page: page + 1, total: totalPages })}</span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('staff.queue.donePageNext')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
