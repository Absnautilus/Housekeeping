import { cn } from '@/lib/cn'
import type { Toast } from '@/hooks/use-toasts'

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm shadow-lg',
            toast.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-purple-200 bg-white text-slate-800',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button type="button" onClick={() => onDismiss(toast.id)} className="cursor-pointer text-xs text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
