import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { createOperator, listStaff, setStaffActive, type OperatorSummary } from '@/lib/admin-api'
import type { StaffDepartment } from '@/lib/types'

const DEPARTMENT_LABEL: Record<StaffDepartment, string> = {
  housekeeping: 'Housekeeping',
  reception: 'Reception',
}

export function OperatorsPage() {
  const [staff, setStaff] = useState<OperatorSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setStaff(await listStaff())
  }

  useEffect(() => {
    reload().catch(() => setError('Non riusciamo a caricare lo staff.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
        <p className="text-sm text-slate-500">Crea account operatore per housekeeping o reception.</p>
      </div>

      <NewOperatorForm onCreated={reload} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Ruolo</th>
              <th className="px-4 py-2">Stato</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff?.map((person) => (
              <tr key={person.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{person.name}</td>
                <td className="px-4 py-2 text-slate-500">
                  {person.role === 'admin' ? 'Admin' : DEPARTMENT_LABEL[person.department ?? 'reception']}
                </td>
                <td className="px-4 py-2">
                  <Badge className={person.active ? 'bg-emerald-100 text-emerald-700' : undefined}>
                    {person.active ? 'Attivo' : 'Disattivato'}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  {person.role !== 'admin' && (
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-slate-700"
                      onClick={() => setStaffActive(person.id, !person.active).then(reload)}
                    >
                      {person.active ? 'Disattiva' : 'Riattiva'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewOperatorForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState<StaffDepartment>('housekeeping')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createOperator({ name: name.trim(), email: email.trim(), password, department })
      setName('')
      setEmail('')
      setPassword('')
      await onCreated()
    } catch {
      setError("Impossibile creare l'account (email già in uso?).")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-700">Nuovo operatore</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="name" required>
                Nome
              </Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="department" required>
                Reparto
              </Label>
              <Select id="department" value={department} onChange={(e) => setDepartment(e.target.value as StaffDepartment)}>
                <option value="housekeeping">Housekeeping</option>
                <option value="reception">Reception</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="password" required>
                Password iniziale
              </Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </FieldGroup>
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creazione…' : 'Crea account'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
