import { useState } from 'react'
import { PublicHeader } from '@/components/public-header'
import { cn } from '@/lib/cn'
import { clearGuestToken, getGuestToken, setGuestToken } from '@/lib/guest-token'
import { LoginScreen } from '@/guest/login-screen'
import { RequestFlow } from '@/guest/request-flow'
import { StatusList } from '@/guest/status-list'

type Tab = 'new' | 'status'

export function GuestApp() {
  const [token, setToken] = useState<string | null>(() => getGuestToken())
  const [tab, setTab] = useState<Tab>('new')
  const [refreshKey, setRefreshKey] = useState(0)

  function onSessionExpired() {
    clearGuestToken()
    setToken(null)
  }

  if (!token) {
    return (
      <LoginScreen
        onSuccess={(newToken) => {
          setGuestToken(newToken)
          setToken(newToken)
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
