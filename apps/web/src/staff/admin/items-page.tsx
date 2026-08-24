import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FieldError, FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/field'
import {
  createRequestType,
  listMenu,
  setRequestTypeActive,
  type RequestCategoryAdmin,
  type RequestTypeAdmin,
} from '@/lib/admin-api'

export function ItemsPage() {
  const [categories, setCategories] = useState<RequestCategoryAdmin[]>([])
  const [types, setTypes] = useState<RequestTypeAdmin[]>([])
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const menu = await listMenu()
    setCategories(menu.categories)
    setTypes(menu.types)
  }

  useEffect(() => {
    reload().catch(() => setError('Non riusciamo a caricare il menu.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Menu richieste</h1>
        <p className="text-sm text-muted">Gli oggetti/servizi che l'ospite può richiedere, raggruppati per categoria.</p>
      </div>

      <NewItemForm categories={categories} onCreated={reload} />

      {error && <p className="text-sm text-bad-ink">{error}</p>}

      <div className="space-y-6">
        {categories.map((category) => {
          const items = types.filter((t) => t.category_id === category.id)
          if (items.length === 0) return null
          return (
            <div key={category.id}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{category.name}</h2>
              <div className="overflow-hidden rounded-lg border border-line bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2">Nome</th>
                      <th className="px-4 py-2">Descrizione</th>
                      <th className="px-4 py-2">Quantità in hotel</th>
                      <th className="px-4 py-2">Stato</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-foreground">{item.name}</td>
                        <td className="px-4 py-2 text-muted">{item.description || '—'}</td>
                        <td className="px-4 py-2 tabular-nums text-muted">{item.available_quantity ?? '—'}</td>
                        <td className="px-4 py-2">
                          <Badge className={item.active ? 'bg-ok-bg text-ok-ink' : undefined}>
                            {item.active ? 'Attivo' : 'Disattivato'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            className="cursor-pointer text-xs text-muted hover:text-foreground"
                            onClick={() => setRequestTypeActive(item.id, !item.active).then(reload)}
                          >
                            {item.active ? 'Disattiva' : 'Riattiva'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NewItemForm({ categories, onCreated }: { categories: RequestCategoryAdmin[]; onCreated: () => Promise<void> }) {
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [allowsQuantity, setAllowsQuantity] = useState(false)
  const [availableQuantity, setAvailableQuantity] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCategoryId((current) => current || (categories[0]?.id ?? ''))
  }, [categories])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createRequestType({
        categoryId,
        name: name.trim(),
        description: description.trim() || null,
        allowsQuantity,
        availableQuantity: availableQuantity.trim() ? Number(availableQuantity) : null,
      })
      setName('')
      setDescription('')
      setAllowsQuantity(false)
      setAvailableQuantity('')
      await onCreated()
    } catch {
      setError('Impossibile aggiungere questo elemento al menu.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Aggiungi elemento</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="category" required>
                Categoria
              </Label>
              <Select id="category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="itemName" required>
                Nome
              </Label>
              <Input id="itemName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Cuscino extra" />
            </FieldGroup>
          </div>

          <FieldGroup>
            <Label htmlFor="description">Descrizione (facoltativa)</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="availableQuantity">Quantità disponibile in hotel (facoltativa)</Label>
              <Input
                id="availableQuantity"
                type="number"
                min={0}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="Es. 10"
              />
            </FieldGroup>
            <FieldGroup className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={allowsQuantity} onChange={(e) => setAllowsQuantity(e.target.checked)} />
                L'ospite può scegliere quante unità richiedere
              </label>
            </FieldGroup>
          </div>

          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" disabled={pending}>
            {pending ? 'Aggiunta…' : 'Aggiungi elemento'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
