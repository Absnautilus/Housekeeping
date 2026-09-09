// Parses an Opera PMS "arrivals by room" report exported as tab-delimited
// text (Opera's "Download As... > Delimited" option).
//
// This is an operational print report flattened to text, not a clean data
// export, so it has real quirks instead of one row per stay:
//   - some lines concatenate two bookings back to back with no separator
//     (an artifact of the report's multi-column print layout)
//   - page-total summary numbers (four bare integers) get appended after
//     the last booking's status on some lines
//   - a booking without an assigned room yet ("TBA") has an empty room
//     field but is otherwise shaped the same
//
// Column position is therefore not reliable across a whole line. What IS
// reliable: every real booking has exactly one "arrival<TAB>departure"
// date pair (DD/MM/YY), and exactly four tab-separated fields immediately
// before it (room, guest name, secondary guest/company, group code). We
// anchor on the date pair and read outward from there instead of trusting
// fixed column indices, so multi-booking lines and trailing page totals
// (which never match the date pattern) are handled without special-casing.

const DATE_PAIR = /(\d{2}\/\d{2}\/\d{2})\t(\d{2}\/\d{2}\/\d{2})/g

export interface OperaArrivalRow {
  roomNumber: string | null
  guestLastName: string
  arrivalDate: string
  departureDate: string
}

export interface OperaImportResult {
  rows: OperaArrivalRow[]
  warnings: string[]
}

function guestSurname(rawName: string): string {
  const [surname] = rawName.split(',')
  return (surname ?? rawName).trim()
}

export function parseOperaArrivals(text: string): OperaImportResult {
  const rows: OperaArrivalRow[] = []
  const warnings: string[] = []

  const lines = text.split(/\r?\n/)
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) return
    const fields = line.split('\t')

    let match: RegExpExecArray | null
    DATE_PAIR.lastIndex = 0
    let found = 0
    while ((match = DATE_PAIR.exec(line))) {
      found++
      // Field index of the arrival date: count tabs before the match start.
      const arrivalIndex = line.slice(0, match.index).split('\t').length - 1
      const roomIndex = arrivalIndex - 4
      const guestIndex = arrivalIndex - 3
      if (roomIndex < 0 || guestIndex < 0) {
        warnings.push(`Riga ${lineIndex + 1}: prenotazione ignorata, campi insufficienti prima della data.`)
        continue
      }
      const roomNumber = fields[roomIndex]?.trim() || null
      const guestRaw = fields[guestIndex]?.trim() ?? ''
      if (!guestRaw) {
        warnings.push(`Riga ${lineIndex + 1}: prenotazione ignorata, nome ospite mancante.`)
        continue
      }
      rows.push({
        roomNumber,
        guestLastName: guestSurname(guestRaw),
        arrivalDate: match[1] ?? '',
        departureDate: match[2] ?? '',
      })
    }
    if (found === 0) {
      warnings.push(`Riga ${lineIndex + 1}: nessuna coppia di date riconosciuta, riga ignorata.`)
    }
  })

  return { rows, warnings }
}

// Opera dates are DD/MM/YY. Combined with a time-of-day (hotel's standard
// check-in/out time, editable per row in the import preview before
// confirming) into the same "local wall-clock string" (YYYY-MM-DDTHH:mm)
// DateTimePicker already uses elsewhere in this app, so imported rows are
// editable in the preview exactly like a manually-entered stay.
export function operaDateToLocalValue(ddmmyy: string, timeOfDay: string): string {
  const [day, month, yearShort] = ddmmyy.split('/')
  const year = 2000 + Number(yearShort)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(Number(month))}-${pad(Number(day))}T${timeOfDay}`
}
