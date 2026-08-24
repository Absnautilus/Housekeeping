import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FieldError, FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/field'
import { AutoText } from '@/components/auto-text'
import {
  createRequestType,
  listMenu,
  setRequestTypeActive,
  type RequestCategoryAdmin,
  type RequestTypeAdmin,
} from '@/lib/admin-api'
import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/lib/i18n/locale-context'

export function ItemsPage() {
  const { t } = useLocale()
  const [categories, setCategories] = useState<RequestCategoryAdmin[]>([])
  const [types, setTypes] = useState<RequestTypeAdmin[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, confirm] = useConfirm()

  async function reload() {
    const menu = await listMenu()
    setCategories(menu.categories)
    setTypes(menu.types)
  }

  useEffect(() => {
    reload().catch(() => setError(t('staff.items.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onToggle(item: RequestTypeAdmin) {
    if (item.active) {
      const ok = await confirm({
        title: t('staff.items.deactivateTitle'),
        description: t('staff.items.deactivateDesc', { name: item.name }),
        confirmLabel: t('staff.items.deactivateConfirm'),
      })
      if (!ok) return
    }
    await setRequestTypeActive(item.id, !item.active)
    await reload()
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('staff.items.title')}</h1>
        <p className="text-sm text-muted">{t('staff.items.subtitle')}</p>
      </div>

      <NewItemForm categories={categories} onCreated={reload} />

      {error && <p className="text-sm text-bad-ink">{error}</p>}

      <div className="space-y-6">
        {categories.map((category) => {
          const items = types.filter((rt) => rt.category_id === category.id)
          if (items.length === 0) return null
          return (
            <div key={category.id}>
              <h2 className="mb-2 text-sm font-semibold text-muted">
                <AutoText text={category.name} />
              </h2>
              <div className="overflow-hidden rounded-lg border border-line bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2">{t('staff.items.colName')}</th>
                      <th className="px-4 py-2">{t('staff.items.colDescription')}</th>
                      <th className="px-4 py-2">{t('staff.items.colQuantity')}</th>
                      <th className="px-4 py-2">{t('staff.items.colStatus')}</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-foreground">
                          <AutoText text={item.name} />
                        </td>
                        <td className="px-4 py-2 text-muted">{item.description ? <AutoText text={item.description} /> : '—'}</td>
                        <td className="px-4 py-2 tabular-nums text-muted">{item.available_quantity ?? '—'}</td>
                        <td className="px-4 py-2">
                          <Badge className={item.active ? 'bg-ok-bg text-ok-ink' : undefined}>
                            {item.active ? t('staff.items.statusActive') : t('staff.items.statusInactive')}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            className="cursor-pointer text-xs text-muted hover:text-foreground"
                            onClick={() => onToggle(item)}
                          >
                            {item.active ? t('staff.items.deactivate') : t('staff.items.reactivate')}
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
  const { t } = useLocale()
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
      setError(t('staff.items.addError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">{t('staff.items.addTitle')}</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="category" required>
                {t('staff.items.category')}
              </Label>
              <Select id="category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    <AutoText text={c.name} />
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="itemName" required>
                {t('staff.items.name')}
              </Label>
              <Input id="itemName" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('staff.items.namePlaceholder')} />
            </FieldGroup>
          </div>

          <FieldGroup>
            <Label htmlFor="description">{t('staff.items.description')}</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="availableQuantity">{t('staff.items.availableQuantity')}</Label>
              <Input
                id="availableQuantity"
                type="number"
                min={0}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder={t('staff.items.availableQuantityPlaceholder')}
              />
            </FieldGroup>
            <FieldGroup className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={allowsQuantity} onChange={(e) => setAllowsQuantity(e.target.checked)} />
                {t('staff.items.allowsQuantity')}
              </label>
            </FieldGroup>
          </div>

          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" disabled={pending}>
            {pending ? t('staff.items.submitPending') : t('staff.items.submit')}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
