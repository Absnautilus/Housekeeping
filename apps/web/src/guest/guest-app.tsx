import { useEffect, useState } from 'react'
import { PublicHeader } from '@/components/public-header'
import { cn } from '@/lib/cn'
import { clearGuestToken, getGuestToken, setGuestToken } from '@/lib/guest-token'
import { isInvalidSessionError, listMyRequests } from '@/lib/guest-api'
import { LoginScreen } from '@/guest/login-screen'
import { RequestFlow } from '@/guest/request-flow'
import { StatusList } from '@/guest/status-list'

type Tab = 'new' | 'status'

export function GuestApp() {
  const [token, setToken] = useState<string | null>(() => getGuestToken())
  // a token surviving in localStorage doesn't mean the stay is still valid
  // (checked out, cancelled, expired) — confirm before showing anything,
  // rather than waiting for the first write to fail
  const [checked, setChecked] = useState(false)
  const [tab, setTab] = useState<Tab>('new')
  const [refreshKey, setRefreshKey] = useState(0)

  function onSessionExpired() {
    clearGuestToken()
    setToken(null)
    setChecked(true)
  }

  useEffect(() => {
    if (!token) {
      setChecked(true)
      return
    }
    let cancelled = false
    listMyRequests(token)
      .then(() => {
        if (!cancelled) setChecked(true)
      })
      .catch((err) => {
        if (cancelled) return
        if (isInvalidSessionError(err)) {
          onSessionExpired()
        } else {
          // a transient/network error shouldn't log the guest out — let them in,
          // individual actions will surface their own errors if it's really down
          setChecked(true)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!checked) return null

  if (!token) {
    return (
      <LoginScreen
        onSuccess={(newToken) => {
          setGuestToken(newToken)
          setToken(newToken)
          setChecked(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <PublicHeader />
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="mb-5 flex gap-1 rounded-md bg-slate-100 p-1">
          <TabButton active={tab === 'new'} onClick={() => setTab('new')}>
            Nuova richiesta
          </TabButton>
          <TabButton active={tab === 'status'} onClick={() => setTab('status')}>
            Le mie richieste
          </TabButton>
        </div>

        {tab === 'new' ? (
          <RequestFlow
            token={token}
            onSessionExpired={onSessionExpired}
            onCreated={() => {
              setRefreshKey((k) => k + 1)
              setTab('status')
            }}
          />
        ) : (
          <StatusList token={token} refreshKey={refreshKey} onSessionExpired={onSessionExpired} />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  )
}
