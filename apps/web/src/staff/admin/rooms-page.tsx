import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table'
import { createRoom, listRooms, setRoomActive, type Room } from '@/lib/admin-api'
import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/lib/i18n/locale-context'

export function RoomsPage() {
  const { t } = useLocale()
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [roomNumber, setRoomNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDialog, confirm] = useConfirm()

  async function reload() {
    setRooms(await listRooms())
  }

  useEffect(() => {
    reload().catch(() => setError(t('staff.rooms.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onToggle(room: Room) {
    if (room.active) {
      const ok = await confirm({
        title: t('staff.rooms.deactivateTitle'),
        description: t('staff.rooms.deactivateDesc', { room: room.room_number }),
        confirmLabel: t('staff.rooms.deactivateConfirm'),
      })
      if (!ok) return
    }
    await setRoomActive(room.id, !room.active)
    await reload()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createRoom(roomNumber.trim())
      setRoomNumber('')
      await reload()
    } catch {
      setError(t('staff.rooms.addError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('staff.rooms.title')}</h1>
        <p className="text-sm text-muted">{t('staff.rooms.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">{t('staff.rooms.addTitle')}</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="flex items-end gap-3">
            <FieldGroup className="mb-0 flex-1">
              <Label htmlFor="roomNumber" required>
                {t('staff.rooms.roomNumber')}
              </Label>
              <Input id="roomNumber" required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </FieldGroup>
            <Button type="submit" disabled={pending}>
              {t('staff.rooms.add')}
            </Button>
          </form>
          <FieldError>{error ?? undefined}</FieldError>
        </CardBody>
      </Card>

      <TableFrame>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>{t('staff.rooms.colRoom')}</TableHeaderCell>
              <TableHeaderCell>{t('staff.rooms.colStatus')}</TableHeaderCell>
              <TableHeaderCell className="w-px" />
            </tr>
          </TableHead>
          <TableBody>
            {rooms?.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium text-foreground">{room.room_number}</TableCell>
                <TableCell>
                  <Badge className={room.active ? 'bg-ok-bg text-ok-ink' : undefined}>
                    {room.active ? t('staff.rooms.statusActive') : t('staff.rooms.statusInactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle(room)}
                  >
                    {room.active ? t('staff.rooms.deactivate') : t('staff.rooms.reactivate')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>
    </div>
  )
}
