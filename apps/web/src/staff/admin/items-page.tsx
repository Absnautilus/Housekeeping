import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FieldError, FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/field'
import { AutoText } from '@/components/auto-text'
import {
  createRequestCategory,
  createRequestType,
  listMenu,
  setRequestCategoryActive,
  setRequestTypeActive,
  type RequestCategoryAdmin,
  type RequestTypeAdmin,
} from '@/lib/admin-api'
import { DEPARTMENTS } from '@/lib/constants'
import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/lib/i18n/locale-context'
import type { Department } from '@/lib/types'

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

  async function onToggleCategory(category: RequestCategoryAdmin) {
    if (category.active) {
      const ok = await confirm({
        title: t('staff.items.categoryDeactivateTitle'),
        description: t('staff.items.categoryDeactivateDesc', { name: category.name }),
        confirmLabel: t('staff.items.categoryDeactivateConfirm'),
      })
      if (!ok) return
    }
    await setRequestCategoryActive(category.id, !category.active)
    await reload()
  }

  async function onToggleItem(item: RequestTypeAdmin) {
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

  const activeCategories = categories.filter((c) => c.active)

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('staff.items.title')}</h1>
        <p className="text-sm text-muted">{t('staff.items.subtitle')}</p>
      </div>

      {error && <p className="text-sm text-bad-ink">{error}</p>}

      <NewCategoryForm onCreated={reload} />

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">{t('staff.items.colName')}</th>
              <th className="px-4 py-2">{t('staff.items.colDepartment')}</th>
              <th className="px-4 py-2">{t('staff.items.colStatus')}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-2 font-medium text-foreground">
                  <AutoText text={category.name} />
                </td>
                <td className="px-4 py-2 text-muted">{t(`department.${category.department}`)}</td>
                <td className="px-4 py-2">
                  <Badge className={category.active ? 'bg-ok-bg text-ok-ink' : undefined}>
                    {category.active ? t('staff.items.statusActive') : t('staff.items.statusInactive')}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <button type="button" className="cursor-pointer text-xs text-muted hover:text-foreground" onClick={() => onToggleCategory(category)}>
                    {category.active ? t('staff.items.deactivate') : t('staff.items.reactivate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewItemForm categories={activeCategories} onCreated={reload} />

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
                            onClick={() => onToggleItem(item)}
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

function NewCategoryForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { t } = useLocale()
  const [name, setName] = useState('')
  const [department, setDepartment] = useState<Department>('housekeeping')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createRequestCategory({ name: name.trim(), department })
      setName('')
      await onCreated()
    } catch {
      setError(t('staff.items.addCategoryError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">{t('staff.items.addCategoryTitle')}</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-x-4 sm:grid-cols-[1fr_1fr_auto]">
          <FieldGroup className="mb-0">
            <Label htmlFor="categoryName" required>
              {t('staff.items.categoryName')}
            </Label>
            <Input id="categoryName" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('staff.items.categoryNamePlaceholder')} />
          </FieldGroup>
          <FieldGroup className="mb-0">
            <Label htmlFor="categoryDepartment" required>
              {t('staff.items.categoryDepartment')}
            </Label>
            <Select id="categoryDepartment" value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {t(`department.${d}`)}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="mb-4">
            {pending ? t('staff.items.addCategorySubmitPending') : t('staff.items.addCategorySubmit')}
          </Button>
        </form>
        <FieldError>{error ?? undefined}</FieldError>
      </CardBody>
    </Card>
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
    setCategoryId((current) => (current && categories.some((c) => c.id === current) ? current : (categories[0]?.id ?? '')))
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
          <Button type="submit" disabled={pending || !categoryId}>
            {pending ? t('staff.items.submitPending') : t('staff.items.submit')}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
