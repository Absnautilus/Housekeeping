import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { RequestRow } from '@/staff/request-row'
import { swapPriority } from '@/lib/staff-api'
import { cn } from '@/lib/cn'
import type { QueuedRequest } from '@/lib/staff-types'

// The up/down arrows already let anyone bump one request at a time; this
// adds drag-to-reorder as a faster way to do the same thing. Both write
// through the same swapPriority(a, b) RPC — a drag just replays it once
// per adjacent step needed to walk the item from its old slot to its new
// one, so there's no new backend surface, just a different way to produce
// the same sequence of swaps the arrows already make.
//
// The dragged card follows the pointer 1:1 via a live translateY (no
// transition while dragging, so it never lags), lifts with a shadow/scale,
// and sits above everything else. Every other card animates into its new
// slot with a FLIP transform whenever the live order changes underneath
// it, instead of jumping there instantly — that's what makes the reorder
// read as "cards sliding" rather than "list re-rendered".
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
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const originalOrderRef = useRef<QueuedRequest[]>(items)
  const dragStartYRef = useRef(0)
  const prevRectsRef = useRef(new Map<string, DOMRect>())
  // Raw pointermove fires far more often than a frame (every few pixels on
  // a trackpad/high-poll-rate mouse) — driving a setState + a
  // getBoundingClientRect per other row from every single event is what
  // made this stutter and then lurch forward. The native handler now just
  // records where the pointer is; a rAF loop applies that position once
  // per frame, which is as often as anything could actually repaint anyway.
  const draggingIdRef = useRef<string | null>(null)
  const latestClientYRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!draggingId) setOrder(items)
  }, [items, draggingId])

  useEffect(() => {
    return () => {
      draggingIdRef.current = null
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>()
    rowRefs.current.forEach((el, id) => newRects.set(id, el.getBoundingClientRect()))

    rowRefs.current.forEach((el, id) => {
      if (id === draggingId) return
      const prev = prevRectsRef.current.get(id)
      const next = newRects.get(id)
      if (!prev || !next) return
      const deltaY = prev.top - next.top
      if (deltaY === 0) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${deltaY}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)'
        el.style.transform = ''
      })
    })

    prevRectsRef.current = newRects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

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

  function tick() {
    const id = draggingIdRef.current
    if (!id) {
      rafRef.current = null
      return
    }
    const clientY = latestClientYRef.current
    setDragOffsetY(clientY - dragStartYRef.current)
    reorderAround(clientY, id)
    rafRef.current = requestAnimationFrame(tick)
  }

  function onHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (!canReorder) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    originalOrderRef.current = order
    dragStartYRef.current = e.clientY
    latestClientYRef.current = e.clientY
    draggingIdRef.current = id
    setDragOffsetY(0)
    setDraggingId(id)
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick)
  }

  function onHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingIdRef.current) return
    latestClientYRef.current = e.clientY
  }

  async function onHandlePointerUp() {
    if (!draggingId) return
    const finalOrder = order
    draggingIdRef.current = null
    setDragOffsetY(0)
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
      {order.map((request, i) => {
        const dragging = draggingId === request.id
        return (
          <div
            key={request.id}
            ref={(el) => {
              if (el) rowRefs.current.set(request.id, el)
              else rowRefs.current.delete(request.id)
            }}
            className={cn('rounded-xl', dragging && 'relative z-20 transition-none')}
            style={
              dragging
                ? { transform: `translateY(${dragOffsetY}px) scale(1.025)`, filter: 'drop-shadow(0 12px 20px rgb(0 0 0 / 0.18))' }
                : undefined
            }
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
        )
      })}
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
