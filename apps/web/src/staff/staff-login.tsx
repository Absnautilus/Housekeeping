import { useState, type FormEvent } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label } from '@/components/ui/field'
import { Logo } from '@/components/logo'
import { signIn, signInOperator } from '@/lib/staff-api'
import { cn } from '@/lib/cn'

type Mode = 'operator' | 'email'

export function StaffLogin() {
  const [mode, setMode] = useState<Mode>('operator')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'operator') {
        await signInOperator(username.trim(), pin)
      } else {
        await signIn(email.trim(), password)
      }
    } catch {
      setError(mode === 'operator' ? 'Username o PIN non corretti.' : 'Email o password non corrette.')
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
          <CardHeader className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-slate-700">Accesso staff</h1>
            <div className="flex gap-1 rounded-md bg-slate-100 p-1">
              <ModeButton active={mode === 'operator'} onClick={() => setMode('operator')}>
                Operatore
              </ModeButton>
              <ModeButton active={mode === 'email'} onClick={() => setMode('email')}>
                Email
              </ModeButton>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSubmit}>
              {mode === 'operator' ? (
                <>
                  <FieldGroup>
                    <Label htmlFor="username" required>
                      Username
                    </Label>
                    <Input id="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="pin" required>
                      PIN
                    </Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="current-password"
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </FieldGroup>
                </>
              ) : (
                <>
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
                </>
              )}
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

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  )
}
