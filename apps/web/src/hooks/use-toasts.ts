import { useCallback, useRef, useState } from 'react'

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'warning'
}

let counter = 0

export function useToasts(autoDismissMs = 8000) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message: string, tone: Toast['tone'] = 'info') => {
      const id = `t${++counter}`
      setToasts((prev) => [...prev, { id, message, tone }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), autoDismissMs),
      )
    },
    [autoDismissMs, dismiss],
  )

  return { toasts, push, dismiss }
}
