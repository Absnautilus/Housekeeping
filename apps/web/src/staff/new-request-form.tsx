import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Label, Select, Textarea } from '@/components/ui/field'
import { listMenu, listRooms, type Room } from '@/lib/admin-api'
import { createStaffRequest } from '@/lib/staff-api'
import type { RequestCategoryAdmin, RequestTypeAdmin } from '@/lib/admin-api'

export function NewRequestForm({ staffId, onCreated }: { staffId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [categories, setCategories] = useState<RequestCategoryAdmin[]>([])
  const [types, setTypes] = useState<RequestTypeAdmin[]>([])
  const [roomId, setRoomId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([listRooms(), listMenu()]).then(([roomList, menu]) => {
      const activeRooms = roomList.filter((r) => r.active)
      setRooms(activeRooms)
      setRoomId((c) => c || (activeRooms[0]?.id ?? ''))
      setCategories(menu.categories)
      setCategoryId((c) => c || (menu.categories[0]?.id ?? ''))
      setTypes(menu.types.filter((t) => t.active))
    })
  }, [open])

  const typesForCategory = types.filter((t) => t.category_id === categoryId)

  useEffect(() => {
    setTypeId(typesForCategory[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const room = rooms.find((r) => r.id === roomId)
    if (!room || !typeId) return
    setPending(true)
    setError(null)
    try {
      await createStaffRequest({ roomNumber: room.room_number, requestTypeId: typeId, note: note.trim() || null, staffId })
      setNote('')
      setOpen(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile creare la segnalazione.')
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        + Nuova segnalazione
      </Button>
    )
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-700">Nuova segnalazione</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
            <FieldGroup>
              <Label htmlFor="sr-room" required>
                Camera
              </Label>
              <Select id="sr-room" required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_number}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="sr-category" required>
                Categoria
              </Label>
              <Select id="sr-category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="sr-type" required>
                Cosa
              </Label>
              <Select id="sr-type" required value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                {typesForCategory.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="sr-note">Note</Label>
            <Textarea id="sr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. porta rotta, non si chiude bene…" />
          </FieldGroup>
          <FieldError>{error ?? undefined}</FieldError>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !roomId || !typeId}>
              {pending ? 'Invio…' : 'Segnala'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annulla
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
