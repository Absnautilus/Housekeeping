import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import {
  getPmsIntegrationStatus,
  listHotels,
  savePmsIntegration,
  triggerPmsSync,
  type Hotel,
  type PmsIntegrationStatus,
  type PmsMode,
  type PmsSyncResult,
} from '@/lib/admin-api'
import type { StaffProfile } from '@/lib/staff-types'

export function PmsIntegrationPage({ profile }: { profile: StaffProfile }) {
  const isMaster = profile.role === 'master'
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [hotelId, setHotelId] = useState('')

  useEffect(() => {
    if (!isMaster) return
    listHotels().then((list) => {
      setHotels(list)
      setHotelId((current) => current || (list[0]?.id ?? ''))
    })
  }, [isMaster])

  if (isMaster && !hotelId) {
    return <p className="text-sm text-muted">Caricamento…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrazione PMS</h1>
        <p className="text-sm text-muted">
          Scegli se gestire camere e soggiorni manualmente oppure collegarli automaticamente a OperaCloud.
        </p>
      </div>

      {isMaster && (
        <FieldGroup className="max-w-xs">
          <Label htmlFor="hotel">Hotel</Label>
          <Select id="hotel" value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      )}

      <PmsIntegrationForm key={hotelId} hotelId={isMaster ? hotelId : undefined} />
    </div>
  )
}

function PmsIntegrationForm({ hotelId }: { hotelId?: string }) {
  const [status, setStatus] = useState<PmsIntegrationStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<PmsMode>('manual')
  const [ohipHotelCode, setOhipHotelCode] = useState('')
  const [ohipEnterpriseId, setOhipEnterpriseId] = useState('')
  const [ohipGatewayUrl, setOhipGatewayUrl] = useState('')
  const [ohipClientId, setOhipClientId] = useState('')
  const [ohipClientSecret, setOhipClientSecret] = useState('')
  const [ohipAppKey, setOhipAppKey] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<PmsSyncResult | null>(null)

  async function reload() {
    try {
      const data = await getPmsIntegrationStatus(hotelId)
      setStatus(data)
      setMode(data.mode)
      setOhipHotelCode(data.ohip_hotel_code ?? '')
      setOhipEnterpriseId(data.ohip_enterprise_id ?? '')
      setOhipGatewayUrl(data.ohip_gateway_url ?? '')
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await savePmsIntegration({
        hotelId,
        mode,
        ohipHotelCode,
        ohipEnterpriseId,
        ohipGatewayUrl,
        ohipClientId: ohipClientId.trim() || null,
        ohipClientSecret: ohipClientSecret.trim() || null,
        ohipAppKey: ohipAppKey.trim() || null,
      })
      setOhipClientId('')
      setOhipClientSecret('')
      setOhipAppKey('')
      setSaved(true)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare la configurazione.')
    } finally {
      setPending(false)
    }
  }

  async function onSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await triggerPmsSync(hotelId)
      setSyncResult(result)
    } catch (err) {
      setSyncResult({ ok: false, error: err instanceof Error ? err.message : 'Sincronizzazione fallita.' })
    } finally {
      setSyncing(false)
      await reload()
    }
  }

  if (loadError) {
    return <div className="rounded-lg border border-bad-ink/25 bg-bad-bg p-4 text-sm text-bad-ink">Non riusciamo a caricare la configurazione: {loadError}</div>
  }
  if (!status) {
    return <p className="text-sm text-muted">Caricamento…</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Modalità gestione camere e soggiorni</h2>
          <div className="flex gap-1 rounded-md bg-surface-2 p-1">
            <ModeButton active={mode === 'manual'} onClick={() => setMode('manual')}>
              Manuale
            </ModeButton>
            <ModeButton active={mode === 'opera'} onClick={() => setMode('opera')}>
              OperaCloud (OHIP)
            </ModeButton>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {mode === 'manual' ? (
          <p className="text-sm text-muted">
            Camere e soggiorni si continuano a inserire a mano dalle pagine "Camere" e "Soggiorni", come oggi.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="ohipHotelCode" required>
                  Hotel Code (Opera)
                </Label>
                <Input id="ohipHotelCode" required value={ohipHotelCode} onChange={(e) => setOhipHotelCode(e.target.value)} placeholder="es. PVVCVE" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="ohipEnterpriseId">Enterprise ID</Label>
                <Input id="ohipEnterpriseId" value={ohipEnterpriseId} onChange={(e) => setOhipEnterpriseId(e.target.value)} placeholder="es. VENCOL" />
              </FieldGroup>
              <FieldGroup className="sm:col-span-2">
                <Label htmlFor="ohipGatewayUrl" required>
                  Endpoint OHIP
                </Label>
                <Input
                  id="ohipGatewayUrl"
                  required
                  value={ohipGatewayUrl}
                  onChange={(e) => setOhipGatewayUrl(e.target.value)}
                  placeholder="https://xxxxx.hospitality-api.eu-frankfurt-1.ocs.oraclecloud.com"
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="ohipClientId" required={!status.has_credentials}>
                  Client ID
                </Label>
                <Input
                  id="ohipClientId"
                  required={!status.has_credentials}
                  value={ohipClientId}
                  onChange={(e) => setOhipClientId(e.target.value)}
                  placeholder={status.has_credentials ? '•••••••• (configurato — lascia vuoto per non modificare)' : ''}
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="ohipClientSecret" required={!status.has_credentials}>
                  Client Secret
                </Label>
                <Input
                  id="ohipClientSecret"
                  type="password"
                  required={!status.has_credentials}
                  value={ohipClientSecret}
                  onChange={(e) => setOhipClientSecret(e.target.value)}
                  placeholder={status.has_credentials ? '•••••••• (configurato — lascia vuoto per non modificare)' : ''}
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="ohipAppKey">App Key (x-app-key)</Label>
                <Input
                  id="ohipAppKey"
                  type="password"
                  value={ohipAppKey}
                  onChange={(e) => setOhipAppKey(e.target.value)}
                  placeholder={status.has_credentials ? '•••••••• (configurato — lascia vuoto per non modificare)' : ''}
                />
              </FieldGroup>
            </div>
            <FieldError>{error ?? undefined}</FieldError>
            {saved && <p className="mb-2 text-sm text-ok-ink">Configurazione salvata.</p>}
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvataggio…' : 'Salva configurazione'}
            </Button>
          </form>
        )}

        {mode === 'opera' && status.has_credentials && (
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={status.last_sync_status === 'success' ? 'bg-ok-bg text-ok-ink' : status.last_sync_status === 'error' ? 'bg-bad-bg text-bad-ink' : undefined}>
                {status.last_sync_status === 'success' ? 'Ultima sincronizzazione riuscita' : status.last_sync_status === 'error' ? 'Ultima sincronizzazione fallita' : 'Non ancora sincronizzato'}
              </Badge>
              {status.last_sync_at && (
                <span className="text-xs text-muted">
                  {new Date(status.last_sync_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
            {status.last_sync_error && <p className="mb-3 text-sm text-bad-ink">{status.last_sync_error}</p>}
            <Button type="button" variant="outline" disabled={syncing} onClick={onSync}>
              {syncing ? 'Sincronizzazione…' : 'Sincronizza ora'}
            </Button>
            {syncResult && (
              <p className="mt-2 text-sm text-muted">
                {syncResult.ok
                  ? `Fatto: ${syncResult.created ?? 0} nuovi soggiorni, ${syncResult.updated ?? 0} aggiornati.`
                  : `Errore: ${syncResult.error}`}
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-white text-foreground shadow-sm' : 'text-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
