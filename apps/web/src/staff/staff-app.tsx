import { useEffect, useState } from 'react'
import { Route, Routes, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { cancelRequest, claimRequest, fetchMyProfile } from '@/lib/staff-api'
import { unlockAudio } from '@/lib/beep'
import { useLocale } from '@/lib/i18n/locale-context'
import type { StaffProfile } from '@/lib/staff-types'
import { StaffLogin } from '@/staff/staff-login'
import { DashboardHeader } from '@/staff/dashboard-header'
import { RequestQueue } from '@/staff/request-queue'
import { AdminHome } from '@/staff/admin/admin-home'
import { StaysPage } from '@/staff/stays/stays-page'

interface StaffAppProps {
  mode?: 'standalone' | 'embedded'
  expectedHotelId?: string
  basePath?: string
}

export function StaffApp({ mode = 'standalone', expectedHotelId, basePath = '/housekeeping' }: StaffAppProps = {}) {
  const { t } = useLocale()
  const embedded = mode === 'embedded'
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const p = await fetchMyProfile()
        if (!cancelled) setProfile(p)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (embedded) {
      // The Hotsflow shell already owns the Supabase session lifecycle. In
      // embedded mode we only resolve the module's compatibility staff row.
      void loadProfile()
      return () => {
        cancelled = true
      }
    }

    async function loadStandalone() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
        return
      }
      await loadProfile()
    }

    void loadStandalone()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true)
      void loadStandalone()
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [embedded])

  // New-request alerts fire from a realtime callback, not a tap, so on
  // iOS/Safari the alert sound would otherwise stay silently suspended for
  // the whole session (see beep.ts) — this unlocks it from the very first
  // real tap anywhere in the dashboard.
  useEffect(() => {
    function onFirstPointer() {
      unlockAudio()
      document.removeEventListener('pointerdown', onFirstPointer)
    }
    document.addEventListener('pointerdown', onFirstPointer)
    return () => document.removeEventListener('pointerdown', onFirstPointer)
  }, [])

  // A tap on the "Accetta richiesta" push notification action opens
  // /staff?claim=<id> in standalone mode. Integrated push deep links remain
  // intentionally out of scope for this compatibility mount.
  useEffect(() => {
    const claimId = searchParams.get('claim')
    if (!claimId || !profile) return
    claimRequest(claimId, profile.id).finally(() => {
      const next = new URLSearchParams(searchParams)
      next.delete('claim')
      setSearchParams(next, { replace: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, profile])

  useEffect(() => {
    const rejectId = searchParams.get('reject')
    if (!rejectId || !profile) return
    cancelRequest(rejectId).finally(() => {
      const next = new URLSearchParams(searchParams)
      next.delete('reject')
      setSearchParams(next, { replace: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, profile])

  if (loading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-line-strong border-t-accent" />
      </div>
    )
  }
  if (!profile) {
    if (embedded) {
      return (
        <div className="rounded-lg border border-line bg-surface p-10 text-center text-sm text-muted">
          {t('staff.routeUnavailable')}
        </div>
      )
    }
    return <StaffLogin />
  }
  if (!profile.active) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center bg-surface-2 px-4 text-center text-sm text-muted">
        {t('staff.accountDisabled')}
      </div>
    )
  }
  if (expectedHotelId && profile.hotel_id !== expectedHotelId) {
    return (
      <div className="rounded-lg border border-line bg-surface p-10 text-center text-sm text-muted">
        {t('staff.routeUnavailable')}
      </div>
    )
  }

  const isAdminLike = profile.role === 'admin' || profile.role === 'master'
  const staysAllowed = isAdminLike || profile.department === 'reception'

  const queueRoute = <Route index element={<RequestQueue profile={profile} />} />
  const staysRoute = staysAllowed ? <Route path="soggiorni" element={<StaysPage />} /> : null
  const adminRoute = isAdminLike ? (
    <Route path="admin/*" element={<AdminHome profile={profile} basePath={`${basePath}/admin`} embedded />} />
  ) : null

  // Embedded: the Hotsflow shell's own .page-content already provides the
  // page max-width/padding/background — an inner copy of the same chrome
  // here would double both (this was the "module in a card" look). Standalone
  // still owns its full page shell, unchanged.
  return (
    <div className={embedded ? undefined : 'min-h-full bg-surface-2'}>
      <DashboardHeader profile={profile} embedded={embedded} basePath={embedded ? basePath : '/staff'} />
      <main className={embedded ? 'pt-4' : 'mx-auto max-w-5xl px-4 py-6 sm:px-6'}>
        {embedded ? (
          <Routes>
            {queueRoute}
            {staysRoute}
            {adminRoute}
            <Route
              path="*"
              element={
                <div className="rounded-lg border border-line bg-surface p-10 text-center text-sm text-muted">
                  {t('staff.routeUnavailable')}
                </div>
              }
            />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<RequestQueue profile={profile} />} />
            {staysAllowed && <Route path="/soggiorni" element={<StaysPage />} />}
            {isAdminLike && <Route path="/admin/*" element={<AdminHome profile={profile} />} />}
            <Route
              path="*"
              element={
                <div className="rounded-lg border border-line bg-surface p-10 text-center text-sm text-muted">
                  {t('staff.routeUnavailable')}
                </div>
              }
            />
          </Routes>
        )}
      </main>
    </div>
  )
}
