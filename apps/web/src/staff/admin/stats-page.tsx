import { useEffect, useState } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { fetchCompletionStats, type StatsSummary } from '@/lib/admin-api'
import { formatDuration } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useLocale } from '@/lib/i18n/locale-context'

export function StatsPage() {
  const { t } = useLocale()
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCompletionStats()
      .then(setStats)
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('staff.stats.title')}</h1>
        <p className="text-sm text-muted">{t('staff.stats.subtitle')}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-bad-ink/25 bg-bad-bg p-4 text-sm text-bad-ink">{t('staff.stats.loadError', { error })}</div>
      ) : stats === null ? (
        <p className="text-sm text-muted">{t('staff.stats.loading')}</p>
      ) : stats.overallCount === 0 ? (
        <p className="text-sm text-muted">{t('staff.stats.empty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardBody>
                <p className="text-xs font-bold tracking-wide text-muted uppercase">{t('staff.stats.completedCount')}</p>
                <p className="mt-1 font-head text-3xl font-extrabold text-foreground">{stats.overallCount}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs font-bold tracking-wide text-muted uppercase">{t('staff.stats.avgTime')}</p>
                <p className="mt-1 font-head text-3xl font-extrabold text-foreground">
                  {stats.overallAvgMinutes !== null ? formatDuration(stats.overallAvgMinutes) : '—'}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h2 className="mb-4 text-sm font-semibold text-foreground">{t('staff.stats.byDepartment')}</h2>
              <div className="space-y-3">
                {stats.byDepartment.map((d) => {
                  const max = stats.byDepartment[0]?.avgMinutes || 1
                  const pct = Math.max(4, Math.round((d.avgMinutes / max) * 100))
                  return (
                    <div key={d.department}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-medium text-foreground">{t(`department.${d.department}` as const)}</span>
                        <span className="text-muted">
                          {formatDuration(d.avgMinutes)} · {t('staff.stats.requestCount', { count: d.count })}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
