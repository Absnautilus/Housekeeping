import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { RequestRow } from '@/staff/request-row'
import { swapPriority } from '@/lib/staff-api'
import type { QueuedRequest } from '@/lib/staff-types'

// The up/down arrows already let anyone bump one request at a time; this
// adds drag-to-reorder as a faster way to do the same thing. Both write
// through the same swapPriority(a, b) RPC — a drag just replays it once
// per adjacent step needed to walk the item from its old slot to its new
// one, so there's no new backend surface, just a different way to produce
// the same sequence of swaps the arrows already make.
export function InProgressColumn({
  items,
  now,
  staffId,
  canReorder,
  onReordered,
}: {
  items: QueuedRequest[]
  now: Date
  staffId: string
  canReorder: boolean
  onReordered: () => Promise<void>
}) {
  const [order, setOrder] = useState(items)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const originalOrderRef = useRef<QueuedRequest[]>(items)

  useEffect(() => {
    if (!draggingId) setOrder(items)
  }, [items, draggingId])

  function reorderAround(pointerY: number, id: string) {
    setOrder((current) => {
      const others = current.filter((r) => r.id !== id)
      let targetIndex = others.length
      for (let i = 0; i < others.length; i++) {
        const other = others[i]
        if (!other) continue
        const el = rowRefs.current.get(other.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (pointerY < rect.top + rect.height / 2) {
          targetIndex = i
          break
        }
      }
      const dragged = current.find((r) => r.id === id)
      if (!dragged) return current
      const next = [...others.slice(0, targetIndex), dragged, ...others.slice(targetIndex)]
      return next.length === current.length && next.every((r, i) => r.id === current[i]?.id) ? current : next
    })
  }

  function onHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (!canReorder) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    originalOrderRef.current = order
    setDraggingId(id)
  }

  function onHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingId) return
    reorderAround(e.clientY, draggingId)
  }

  async function onHandlePointerUp() {
    if (!draggingId) return
    const finalOrder = order
    setDraggingId(null)

    const original = originalOrderRef.current
    if (original.map((r) => r.id).join() === finalOrder.map((r) => r.id).join()) return

    // Walk `working` from the original order to finalOrder one adjacent
    // swap at a time, persisting each step — the same operation the
    // up/down arrows perform, just repeated until the order matches.
    const working = [...original]
    for (let i = 0; i < finalOrder.length; i++) {
      const target = finalOrder[i]
      if (!target || working[i]?.id === target.id) continue
      const fromIndex = working.findIndex((r) => r.id === target.id)
      for (let k = fromIndex; k > i; k--) {
        const a = working[k]!
        const b = working[k - 1]!
        await swapPriority(a, b)
        working[k] = b
        working[k - 1] = a
      }
    }
    await onReordered()
  }

  return (
    <div className="space-y-3">
      {order.map((request, i) => (
        <div
          key={request.id}
          ref={(el) => {
            if (el) rowRefs.current.set(request.id, el)
            else rowRefs.current.delete(request.id)
          }}
          className={draggingId === request.id ? 'opacity-60' : undefined}
        >
          <RequestRow
            request={request}
            now={now}
            staffId={staffId}
            mode="active"
            canReorder={canReorder}
            onMoveUp={i > 0 ? () => moveAdjacent(order, i, -1, onReordered) : undefined}
            onMoveDown={i < order.length - 1 ? () => moveAdjacent(order, i, 1, onReordered) : undefined}
            onDragPointerDown={canReorder ? (e) => onHandlePointerDown(e, request.id) : undefined}
            onDragPointerMove={canReorder ? onHandlePointerMove : undefined}
            onDragPointerUp={canReorder ? onHandlePointerUp : undefined}
          />
        </div>
      ))}
    </div>
  )
}

async function moveAdjacent(order: QueuedRequest[], index: number, direction: -1 | 1, onReordered: () => Promise<void>) {
  const other = order[index + direction]
  const current = order[index]
  if (!other || !current) return
  await swapPriority(current, other)
  await onReordered()
}
