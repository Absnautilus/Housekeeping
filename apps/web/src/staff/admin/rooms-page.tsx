import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { createRoom, listRooms, setRoomActive, type Room } from '@/lib/admin-api'

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [roomNumber, setRoomNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function reload() {
    setRooms(await listRooms())
  }

  useEffect(() => {
    reload().catch(() => setError('Non riusciamo a caricare le camere.'))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createRoom(roomNumber.trim())
      setRoomNumber('')
      await reload()
    } catch {
      setError('Impossibile aggiungere la camera (numero già esistente?).')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Camere</h1>
        <p className="text-sm text-slate-500">Le camere qui sotto sono selezionabili quando si attiva un soggiorno.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Aggiungi camera</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="flex items-end gap-3">
            <FieldGroup className="mb-0 flex-1">
              <Label htmlFor="roomNumber" required>
                Numero camera
              </Label>
              <Input id="roomNumber" required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </FieldGroup>
            <Button type="submit" disabled={pending}>
              Aggiungi
            </Button>
          </form>
          <FieldError>{error ?? undefined}</FieldError>
        </CardBody>
      </Card>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">Camera</th>
              <th className="px-4 py-2">Stato</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms?.map((room) => (
              <tr key={room.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{room.room_number}</td>
                <td className="px-4 py-2">
                  <Badge className={room.active ? 'bg-emerald-100 text-emerald-700' : undefined}>
                    {room.active ? 'Attiva' : 'Disattivata'}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="cursor-pointer text-xs text-slate-400 hover:text-slate-700"
                    onClick={() => setRoomActive(room.id, !room.active).then(reload)}
                  >
                    {room.active ? 'Disattiva' : 'Riattiva'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
