import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import {
  createStaffAccount,
  listHotels,
  listStaff,
  setStaffActive,
  type Hotel,
  type OperatorSummary,
} from '@/lib/admin-api'
import { isValidPin } from '@/lib/operator-login'
import type { StaffDepartment, StaffRole } from '@/lib/types'
import type { StaffProfile } from '@/lib/staff-types'

function describeCreateAccountError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/non-2xx|failed to send a request|not found/i.test(message)) {
    return "La funzione che crea gli account non risulta pubblicata su Supabase (Edge Functions → create-staff-account)."
  }
  return `Impossibile creare l'account: ${message}`
}

const DEPARTMENT_LABEL: Record<StaffDepartment, string> = {
  housekeeping: 'Housekeeping',
  reception: 'Reception',
  maintenance: 'Maintenance',
}

const ROLE_LABEL: Record<StaffRole, string> = {
  master: 'Master',
  admin: 'Admin',
  operatore: 'Operatore',
}

export function OperatorsPage({ profile }: { profile: StaffProfile }) {
  const isMaster = profile.role === 'master'
  const [staff, setStaff] = useState<OperatorSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setStaff(await listStaff())
  }

  useEffect(() => {
    reload().catch(() => setError('Non riusciamo a caricare lo staff.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Staff</h1>
        <p className="text-sm text-muted">
          {isMaster
            ? "Crea account admin per un hotel (email e password), o operatore per housekeeping/reception (username e PIN)."
            : 'Crea account operatore per housekeeping o reception: scegli tu username e PIN.'}
        </p>
      </div>

      <NewStaffForm isMaster={isMaster} onCreated={reload} />

      {error && <p className="text-sm text-bad-ink">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Ruolo</th>
              <th className="px-4 py-2">Accesso</th>
              <th className="px-4 py-2">Stato</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff?.map((person) => {
              const roleLabel = person.role === 'operatore' ? DEPARTMENT_LABEL[person.department ?? 'reception'] : ROLE_LABEL[person.role]
              // an admin can only ever touch operatori; only master can deactivate an admin,
              // and nobody deactivates a master from this screen
              const canToggle = person.role === 'operatore' || (person.role === 'admin' && isMaster)
              return (
                <tr key={person.id}>
                  <td className="px-4 py-2 font-medium text-foreground">{person.name}</td>
                  <td className="px-4 py-2 text-muted">{roleLabel}</td>
                  <td className="px-4 py-2 text-muted">{person.login_username ?? <span className="text-muted">email</span>}</td>
                  <td className="px-4 py-2">
                    <Badge className={person.active ? 'bg-ok-bg text-ok-ink' : undefined}>
                      {person.active ? 'Attivo' : 'Disattivato'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canToggle && (
                      <button
                        type="button"
                        className="cursor-pointer text-xs text-muted hover:text-foreground"
                        onClick={() => setStaffActive(person.id, !person.active).then(reload)}
                      >
                        {person.active ? 'Disattiva' : 'Riattiva'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewStaffForm({ isMaster, onCreated }: { isMaster: boolean; onCreated: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'operatore'>('operatore')
  const [department, setDepartment] = useState<StaffDepartment>('housekeeping')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [hotelId, setHotelId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isMaster) return
    listHotels()
      .then((list) => {
        setHotels(list)
        setHotelId((current) => current || (list[0]?.id ?? ''))
      })
      .catch(() => setError('Non riusciamo a caricare gli hotel.'))
  }, [isMaster])

  const effectiveRole = isMaster ? role : 'operatore'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (effectiveRole === 'operatore' && !isValidPin(pin)) {
      setError('Il PIN deve avere esattamente 6 cifre.')
      return
    }

    setPending(true)
    try {
      if (effectiveRole === 'admin') {
        await createStaffAccount({ name: name.trim(), role: 'admin', email: email.trim(), password, hotelId })
      } else {
        await createStaffAccount({
          name: name.trim(),
          role: 'operatore',
          username: username.trim(),
          pin,
          department,
          hotelId: isMaster ? hotelId : undefined,
        })
      }
      setName('')
      setUsername('')
      setPin('')
      setEmail('')
      setPassword('')
      await onCreated()
    } catch (err) {
      setError(describeCreateAccountError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">{isMaster ? 'Nuovo account' : 'Nuovo operatore'}</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="name" required>
                Nome
              </Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </FieldGroup>

            {isMaster && (
              <FieldGroup>
                <Label htmlFor="hotel" required>
                  Hotel
                </Label>
                <Select id="hotel" required value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            )}

            {isMaster && (
              <FieldGroup>
                <Label htmlFor="role" required>
                  Ruolo
                </Label>
                <Select id="role" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'operatore')}>
                  <option value="operatore">Operatore</option>
                  <option value="admin">Admin hotel</option>
                </Select>
              </FieldGroup>
            )}

            {effectiveRole === 'operatore' && (
              <FieldGroup>
                <Label htmlFor="department" required>
                  Reparto
                </Label>
                <Select id="department" value={department} onChange={(e) => setDepartment(e.target.value as StaffDepartment)}>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="reception">Reception</option>
                  <option value="maintenance">Maintenance</option>
                </Select>
              </FieldGroup>
            )}

            {effectiveRole === 'operatore' ? (
              <>
                <FieldGroup>
                  <Label htmlFor="username" required>
                    Username
                  </Label>
                  <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="es. mario" />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="pin" required>
                    PIN (6 cifre)
                  </Label>
                  <Input
                    id="pin"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </FieldGroup>
              </>
            ) : (
              <>
                <FieldGroup>
                  <Label htmlFor="email" required>
                    Email
                  </Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="password" required>
                    Password iniziale
                  </Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </FieldGroup>
              </>
            )}
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" disabled={pending || (isMaster && !hotelId)}>
            {pending ? 'Creazione…' : 'Crea account'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
