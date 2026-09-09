import { useRef, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldGroup, Input, Label, Select } from '@/components/ui/field'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import type { Room } from '@/lib/admin-api'
import { createStay } from '@/lib/stays-api'
import { operaDateToLocalValue, parseOperaArrivals } from '@/lib/opera-import'
import { useLocale } from '@/lib/i18n/locale-context'

const DEFAULT_CHECK_IN_TIME = '15:00'
const DEFAULT_CHECK_OUT_TIME = '11:00'

interface DraftRow {
  key: string
  roomNumber: string | null
  roomId: string
  guestLastName: string
  checkIn: string
  checkOut: string
  include: boolean
}

export function OperaImportPanel({ rooms, onImported }: { rooms: Room[]; onImported: () => Promise<void> }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function roomIdFor(roomNumber: string | null): string {
    if (!roomNumber) return ''
    return rooms.find((room) => room.room_number === roomNumber)?.id ?? ''
  }

  async function onFileSelected(file: File) {
    const text = await file.text()
    const { rows, warnings: parseWarnings } = parseOperaArrivals(text)
    setWarnings(parseWarnings)
    setResult(null)
    setDrafts(
      rows.map((row, index) => ({
        key: `${index}-${row.roomNumber ?? 'tba'}-${row.guestLastName}`,
        roomNumber: row.roomNumber,
        roomId: roomIdFor(row.roomNumber),
        guestLastName: row.guestLastName,
        checkIn: operaDateToLocalValue(row.arrivalDate, DEFAULT_CHECK_IN_TIME),
        checkOut: operaDateToLocalValue(row.departureDate, DEFAULT_CHECK_OUT_TIME),
        include: Boolean(roomIdFor(row.roomNumber)),
      })),
    )
  }

  function updateDraft(key: string, changes: Partial<DraftRow>) {
    setDrafts((current) => current?.map((draft) => (draft.key === key ? { ...draft, ...changes } : draft)) ?? null)
  }

  async function onConfirm() {
    if (!drafts) return
    setSubmitting(true)
    let ok = 0
    let failed = 0
    for (const draft of drafts) {
      if (!draft.include || !draft.roomId) continue
      try {
        await createStay({
          roomId: draft.roomId,
          guestLastName: draft.guestLastName,
          checkInAt: new Date(draft.checkIn).toISOString(),
          checkOutAt: new Date(draft.checkOut).toISOString(),
        })
        ok++
      } catch {
        failed++
      }
    }
    setSubmitting(false)
    setResult({ ok, failed })
    setDrafts(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (ok > 0) await onImported()
  }

  const includedCount = drafts?.filter((d) => d.include && d.roomId).length ?? 0

  return (
    <Card>
      <CardHeader>
        <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
          <h2 className="text-sm font-semibold text-foreground">{t('staff.stays.importTitle')}</h2>
          <span className="text-xs text-muted">{open ? t('staff.stays.importHide') : t('staff.stays.importShow')}</span>
        </button>
      </CardHeader>
      {open && (
        <CardBody>
          <p className="mb-3 text-sm text-muted">{t('staff.stays.importSubtitle')}</p>
          <FieldGroup className="mb-3">
            <Label htmlFor="opera-file">{t('staff.stays.importFileLabel')}</Label>
            <input
              ref={fileInputRef}
              id="opera-file"
              type="file"
              accept=".txt,.csv,text/plain"
              className="block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onFileSelected(file)
              }}
            />
          </FieldGroup>

          {result && (
            <p className="mb-3 text-sm text-foreground">
              {t('staff.stays.importResult', { ok: result.ok, failed: result.failed })}
            </p>
          )}

          {warnings.length > 0 && (
            <div className="mb-3 rounded-lg border border-wait-line bg-wait-bg p-3 text-xs text-wait-ink">
              {t('staff.stays.importWarnings', { count: warnings.length })}
              <ul className="mt-1 list-disc pl-4">
                {warnings.slice(0, 10).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {drafts && drafts.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-line bg-white">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2" />
                      <th className="px-3 py-2">{t('staff.stays.room')}</th>
                      <th className="px-3 py-2">{t('staff.stays.guestLastName')}</th>
                      <th className="px-3 py-2">{t('staff.stays.checkIn')}</th>
                      <th className="px-3 py-2">{t('staff.stays.checkOut')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {drafts.map((draft) => (
                      <tr key={draft.key} className={draft.include ? undefined : 'opacity-50'}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={draft.include}
                            disabled={!draft.roomId}
                            onChange={(e) => updateDraft(draft.key, { include: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={draft.roomId}
                            onChange={(e) => updateDraft(draft.key, { roomId: e.target.value, include: Boolean(e.target.value) })}
                            className="min-w-32"
                          >
                            <option value="">{draft.roomNumber ? t('staff.stays.importRoomNotFound', { room: draft.roomNumber }) : t('staff.stays.importRoomUnassigned')}</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.room_number}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input value={draft.guestLastName} onChange={(e) => updateDraft(draft.key, { guestLastName: e.target.value })} />
                        </td>
                        <td className="px-3 py-2">
                          <DateTimePicker value={draft.checkIn} onChange={(value) => updateDraft(draft.key, { checkIn: value })} />
                        </td>
                        <td className="px-3 py-2">
                          <DateTimePicker value={draft.checkOut} onChange={(value) => updateDraft(draft.key, { checkOut: value })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button type="button" disabled={submitting || includedCount === 0} onClick={onConfirm}>
                  {submitting ? t('staff.stays.importSubmitPending') : t('staff.stays.importSubmit', { count: includedCount })}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  )
}
