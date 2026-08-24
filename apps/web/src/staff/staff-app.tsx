import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchMyProfile } from '@/lib/staff-api'
import type { StaffProfile } from '@/lib/staff-types'
import { StaffLogin } from '@/staff/staff-login'
import { DashboardHeader } from '@/staff/dashboard-header'
import { RequestQueue } from '@/staff/request-queue'
import { AdminHome } from '@/staff/admin/admin-home'
import { StaysPage } from '@/staff/stays/stays-page'

export function StaffApp() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StaffProfile | null>(null)

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

  if (loading) return null
  if (!profile) return <StaffLogin />
  if (!profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 text-center text-sm text-muted">
        Il tuo account è disattivato. Contatta l'amministratore dell'hotel.
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
        </Routes>
      </main>
    </div>
  )
}
