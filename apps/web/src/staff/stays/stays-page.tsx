import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState, IconBedEmpty } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label, Select } from '@/components/ui/field'
import { listRooms, type Room } from '@/lib/admin-api'
import { cancelStay, createStay, listStays, updateCheckout, type Stay } from '@/lib/stays-api'
import { useConfirm } from '@/components/confirm-dialog'

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function StaysPage() {
  const [stays, setStays] = useState<Stay[] | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const [s, r] = await Promise.all([listStays(), listRooms()])
    setStays(s)
    setRooms(r.filter((room) => room.active))
  }

  useEffect(() => {
    reload().catch(() => setError('Non riusciamo a caricare i soggiorni.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Soggiorni</h1>
        <p className="text-sm text-muted">Attiva un soggiorno per abilitare l'accesso ospite alla camera.</p>
      </div>

      <NewStayForm rooms={rooms} onCreated={reload} />

      {error && <p className="text-sm text-bad-ink">{error}</p>}

      <div className="space-y-3">
        {stays === null ? (
          <p className="text-sm text-muted">Caricamento…</p>
        ) : stays.length === 0 ? (
          <EmptyState icon={<IconBedEmpty className="h-6 w-6" />} title="Nessun soggiorno attivo" description="Attiva un soggiorno qui sopra per abilitare l'accesso ospite alla camera." />
        ) : (
          stays.map((stay) => <StayRow key={stay.id} stay={stay} onChanged={reload} />)
        )}
      </div>
    </div>
  )
}

function NewStayForm({ rooms, onCreated }: { rooms: Room[]; onCreated: () => Promise<void> }) {
  const [roomId, setRoomId] = useState('')
  const [lastName, setLastName] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdPin, setCreatedPin] = useState<{ roomNumber: string; pin: string } | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setCreatedPin(null)
    try {
      const stay = await createStay({
        roomId,
        guestLastName: lastName.trim(),
        checkInAt: new Date(checkIn).toISOString(),
        checkOutAt: new Date(checkOut).toISOString(),
      })
      setCreatedPin({ roomNumber: stay.rooms?.room_number ?? '', pin: stay.guest_pin })
      setLastName('')
      setCheckIn('')
      setCheckOut('')
      await onCreated()
    } catch {
      setError('Impossibile attivare il soggiorno: controlla che la camera non abbia già un soggiorno attivo sovrapposto.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Attiva soggiorno</h2>
      </CardHeader>
      <CardBody>
        {createdPin && (
          <div className="mb-4 rounded-lg border border-ok-ink/25 bg-ok-bg p-3 text-sm text-ok-ink">
            Soggiorno attivato — Camera {createdPin.roomNumber}, PIN ospite:{' '}
            <span className="font-mono text-base font-semibold tracking-widest">{createdPin.pin}</span>
            <br />
            Comunica questo PIN all'ospite (es. scrivilo sulla busta della chiave).
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="room" required>
                Camera
              </Label>
              <Select id="room" required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="" disabled>
                  Seleziona…
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_number}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="lastName" required>
                Cognome ospite
              </Label>
              <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="checkIn" required>
                Check-in
              </Label>
              <Input id="checkIn" type="datetime-local" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="checkOut" required>
                Check-out
              </Label>
              <Input id="checkOut" type="datetime-local" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </FieldGroup>
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" disabled={pending}>
            {pending ? 'Attivazione…' : 'Attiva soggiorno'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}

function StayRow({ stay, onChanged }: { stay: Stay; onChanged: () => Promise<void> }) {
  const [editingCheckout, setEditingCheckout] = useState(false)
  const [checkOut, setCheckOut] = useState(toLocalInputValue(stay.check_out_at))
  const [pending, setPending] = useState(false)
  const [confirmDialog, confirm] = useConfirm()

  async function run(action: () => Promise<void>) {
    setPending(true)
    try {
      await action()
      await onChanged()
    } finally {
      setPending(false)
    }
  }

  async function onDeactivate() {
    const ok = await confirm({
      title: 'Disattivare il soggiorno?',
      description: `Camera ${stay.rooms?.room_number} · ${stay.guest_last_name} perderà subito l'accesso con il PIN ${stay.guest_pin}.`,
      confirmLabel: 'Disattiva',
    })
    if (ok) run(() => cancelStay(stay.id))
  }

  return (
    <Card>
      {confirmDialog}
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            Camera {stay.rooms?.room_number} · {stay.guest_last_name}
          </p>
          <p className="text-sm text-muted">
            Check-out: {new Date(stay.check_out_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · PIN:{' '}
            <span className="font-mono font-semibold tracking-widest text-foreground">{stay.guest_pin}</span>
          </p>
        </div>
        {editingCheckout ? (
          <div className="flex items-center gap-2">
            <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="py-1" />
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => updateCheckout(stay.id, new Date(checkOut).toISOString())).then(() => setEditingCheckout(false))}
            >
              Salva
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingCheckout(false)}>
              Annulla
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => updateCheckout(stay.id, new Date().toISOString()))}>
              Anticipa checkout
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditingCheckout(true)}>
              Estendi
            </Button>
            <Button size="sm" variant="danger" disabled={pending} onClick={onDeactivate}>
              Disattiva
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
