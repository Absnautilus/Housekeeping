import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Label, Textarea } from '@/components/ui/field'
import { CategoryIcon } from '@/components/category-icon'
import { createGuestRequest, fetchMenu, isInvalidSessionError } from '@/lib/guest-api'
import type { GuestRequest, RequestCategory, RequestType } from '@/lib/types'

type Step =
  | { name: 'categories' }
  | { name: 'types'; category: RequestCategory }
  | { name: 'compose'; category: RequestCategory; type: RequestType }
  | { name: 'confirm'; type: RequestType; request: GuestRequest }

export function RequestFlow({
  token,
  onSessionExpired,
  onCreated,
}: {
  token: string
  onSessionExpired: () => void
  onCreated: (request: GuestRequest) => void
}) {
  const [menu, setMenu] = useState<{ categories: RequestCategory[]; types: RequestType[] } | null>(null)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>({ name: 'categories' })

  useEffect(() => {
    fetchMenu()
      .then(setMenu)
      .catch(() => setMenuError('Non riusciamo a caricare le richieste disponibili. Riprova tra poco.'))
  }, [])

  if (menuError) {
    return <p className="text-center text-sm text-red-600">{menuError}</p>
  }

  if (!menu) {
    return <p className="text-center text-sm text-slate-500">Caricamento…</p>
  }

  if (step.name === 'categories') {
    return (
      <CategoriesGrid
        categories={menu.categories}
        onSelect={(category) => setStep({ name: 'types', category })}
      />
    )
  }

  if (step.name === 'types') {
    const types = menu.types.filter((t) => t.category_id === step.category.id)
    return (
      <TypesList
        category={step.category}
        types={types}
        onBack={() => setStep({ name: 'categories' })}
        onSelect={(type) => setStep({ name: 'compose', category: step.category, type })}
      />
    )
  }

  if (step.name === 'compose') {
    return (
      <ComposeForm
        type={step.type}
        onBack={() => setStep({ name: 'types', category: step.category })}
        onSubmit={async (quantity, note) => {
          try {
            const request = await createGuestRequest(token, step.type.id, quantity, note)
            setStep({ name: 'confirm', type: step.type, request })
            onCreated(request)
          } catch (error) {
            if (isInvalidSessionError(error)) {
              onSessionExpired()
              return
            }
            throw error
          }
        }}
      />
    )
  }

  return (
    <ConfirmPanel
      type={step.type}
      request={step.request}
      onNewRequest={() => setStep({ name: 'categories' })}
    />
  )
}

function CategoriesGrid({
  categories,
  onSelect,
}: {
  categories: RequestCategory[]
  onSelect: (category: RequestCategory) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category)}
          className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm transition-colors hover:border-purple-300 hover:bg-purple-50"
        >
          <CategoryIcon icon={category.icon} className="h-7 w-7 text-purple-600" />
          <span className="text-sm font-medium text-slate-800">{category.name}</span>
        </button>
      ))}
    </div>
  )
}

function TypesList({
  category,
  types,
  onBack,
  onSelect,
}: {
  category: RequestCategory
  types: RequestType[]
  onBack: () => void
  onSelect: (type: RequestType) => void
}) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-700" aria-label="Indietro">
          ←
        </button>
        <h2 className="text-sm font-semibold text-slate-700">{category.name}</h2>
      </CardHeader>
      <CardBody className="space-y-2">
        {types.length === 0 && <p className="text-sm text-slate-500">Nessuna richiesta disponibile in questa categoria.</p>}
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type)}
            className="block w-full rounded-md border border-slate-200 p-3 text-left text-sm hover:border-purple-300 hover:bg-purple-50"
          >
            <span className="font-medium text-slate-900">{type.name}</span>
            {type.description && <p className="mt-0.5 text-xs text-slate-500">{type.description}</p>}
          </button>
        ))}
      </CardBody>
    </Card>
  )
}

function ComposeForm({
  type,
  onBack,
  onSubmit,
}: {
  type: RequestType
  onBack: () => void
  onSubmit: (quantity: number | null, note: string | null) => Promise<void>
}) {
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setPending(true)
    setError(null)
    try {
      await onSubmit(type.allows_quantity ? quantity : null, note.trim() || null)
    } catch {
      setError('Non siamo riusciti a inviare la richiesta. Riprova.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-700" aria-label="Indietro">
          ←
        </button>
        <h2 className="text-sm font-semibold text-slate-700">{type.name}</h2>
      </CardHeader>
      <CardBody>
        {type.allows_quantity && (
          <FieldGroup>
            <Label>Quantità</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">{quantity}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuantity((q) => Math.min(10, q + 1))}>
                +
              </Button>
            </div>
          </FieldGroup>
        )}
        <FieldGroup>
          <Label htmlFor="note">Note (facoltative)</Label>
          <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Aggiungi un dettaglio per lo staff…" />
        </FieldGroup>
        <FieldError>{error ?? undefined}</FieldError>
        <Button type="button" disabled={pending} onClick={onConfirm} className="mt-2 w-full">
          {pending ? 'Invio in corso…' : 'Invia richiesta'}
        </Button>
      </CardBody>
    </Card>
  )
}

function ConfirmPanel({
  type,
  request,
  onNewRequest,
}: {
  type: RequestType
  request: GuestRequest
  onNewRequest: () => void
}) {
  const time = useMemo(
    () => new Date(request.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    [request.created_at],
  )
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
      <p className="text-lg font-semibold text-emerald-800">Richiesta inviata alla Reception</p>
      <p className="mt-2 text-sm text-emerald-700">
        {type.name}
        {request.quantity ? ` · ${request.quantity}` : ''} — ore {time}
      </p>
      <Button variant="outline" className="mt-4 bg-white" onClick={onNewRequest}>
        Nuova richiesta
      </Button>
    </div>
  )
}
