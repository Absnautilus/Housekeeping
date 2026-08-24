import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const controlClass =
  'w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-3 focus:ring-accent-soft disabled:bg-surface-2'

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode
  htmlFor?: string
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted">
      {children}
      {required && <span className="text-bad-ink"> *</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClass, props.className)} />
}

interface SelectOption {
  value: string
  label: ReactNode
  disabled: boolean
}

// A themed dropdown with the same external shape as a native <select> (an
// id, value, onChange({ target: { value } }), <option> children) so every
// call site keeps working unmodified. A real <select>'s open menu is
// rendered by the OS/browser chrome and can't be restyled — this renders
// its own listbox instead, so the open state (colors, highlight) actually
// matches the rest of the app instead of falling back to system UI.
export function Select({ children, value, onChange, disabled, required, className, id }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = useMemo<SelectOption[]>(
    () =>
      Children.toArray(children).flatMap((child) => {
        if (!isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child)) return []
        return [{ value: String(child.props.value ?? ''), label: child.props.children, disabled: Boolean(child.props.disabled) }]
      }),
    [children],
  )

  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function commit(index: number) {
    const option = options[index]
    if (!option || option.disabled) return
    onChange?.({ target: { value: option.value } } as unknown as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlighted(selectedIndex >= 0 ? selectedIndex : 0)
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      commit(highlighted)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => {
          if (disabled) return
          setHighlighted(selectedIndex >= 0 ? selectedIndex : 0)
          setOpen((o) => !o)
        }}
        onKeyDown={onKeyDown}
        className={cn(controlClass, 'flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed', className)}
      >
        <span className={cn('truncate', !selected && 'text-muted')}>{selected?.label ?? ' '}</span>
        <ChevronDownIcon className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-line-strong bg-surface py-1 shadow-lg">
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => commit(index)}
              className={cn(
                'px-3 py-2 text-sm',
                option.disabled
                  ? 'cursor-not-allowed text-muted'
                  : cn('cursor-pointer', index === highlighted ? 'bg-accent-soft text-accent' : 'text-foreground hover:bg-surface-2'),
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChevronDownIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null
  return <p className="mt-1 text-[11px] font-semibold text-bad-ink">{children}</p>
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}
