import { useEffect, useState } from 'react'
import { Route, Routes, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { claimRequest, fetchMyProfile } from '@/lib/staff-api'
import { useLocale } from '@/lib/i18n/locale-context'
import type { StaffProfile } from '@/lib/staff-types'
import { StaffLogin } from '@/staff/staff-login'
import { DashboardHeader } from '@/staff/dashboard-header'
import { RequestQueue } from '@/staff/request-queue'
import { AdminHome } from '@/staff/admin/admin-home'
import { StaysPage } from '@/staff/stays/stays-page'

export function StaffApp() {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
        return
      }
      try {
        const p = await fetchMyProfile()
        if (!cancelled) setProfile(p)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true)
      load()
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // A tap on the "Accetta richiesta" push notification action opens
  // /staff?claim=<id> — claim it on the caller's behalf, then drop the param
  // so a page refresh doesn't try to re-claim (or un-claim someone else's
  // pickup) an already-handled request.
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-line-strong border-t-accent" />
      </div>
    )
  }
  if (!profile) return <StaffLogin />
  if (!profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 text-center text-sm text-muted">
        {t('staff.accountDisabled')}
      </div>
    )
  }

  const isAdminLike = profile.role === 'admin' || profile.role === 'master'

  return (
    <div className="min-h-screen bg-surface-2">
      <DashboardHeader profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<RequestQueue profile={profile} />} />
          {(isAdminLike || profile.department === 'reception') && <Route path="/soggiorni" element={<StaysPage />} />}
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
      </main>
    </div>
  )
}
