import { useState, type FormEvent } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label } from '@/components/ui/field'
import { Logo } from '@/components/logo'
import { signIn } from '@/lib/staff-api'

export function StaffLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await signIn(email.trim(), password)
    } catch {
      setError('Email o password non corrette.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <h1 className="text-sm font-semibold text-slate-700">Accesso staff</h1>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FieldGroup>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" disabled={pending} className="mt-2 w-full">
                {pending ? 'Accesso in corso…' : 'Accedi'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
