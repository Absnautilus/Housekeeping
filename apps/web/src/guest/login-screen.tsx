import { useState, type FormEvent } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { PublicHeader } from '@/components/public-header'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label } from '@/components/ui/field'
import { GENERIC_LOGIN_ERROR, guestLogin } from '@/lib/guest-api'

export function LoginScreen({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [roomNumber, setRoomNumber] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const token = await guestLogin(roomNumber.trim(), lastName.trim())
      if (!token) {
        setError(GENERIC_LOGIN_ERROR)
        return
      }
      onSuccess(token)
    } catch {
      setError(GENERIC_LOGIN_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <PublicHeader />
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Accedi al tuo soggiorno</h1>
          <p className="mt-1 text-sm text-slate-500">Inserisci il numero di camera e il tuo cognome.</p>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700">I tuoi dati</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                <Label htmlFor="roomNumber" required>
                  Camera
                </Label>
                <Input
                  id="roomNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="lastName" required>
                  Cognome
                </Label>
                <Input
                  id="lastName"
                  autoComplete="off"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </FieldGroup>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" disabled={pending} className="mt-2 w-full">
                {pending ? 'Verifica in corso…' : 'Accedi'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
