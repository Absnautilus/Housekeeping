import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { PublicHeader } from '@/components/public-header'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, Input, Label } from '@/components/ui/field'
import { guestLogin } from '@/lib/guest-api'
import { useLocale } from '@/lib/i18n/locale-context'

export function LoginScreen({ onSuccess }: { onSuccess: (token: string) => void }) {
  const { t } = useLocale()
  const [roomNumber, setRoomNumber] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const token = await guestLogin(roomNumber.trim(), pin.trim())
      if (!token) {
        setError(t('login.genericError'))
        return
      }
      onSuccess(token)
    } catch {
      setError(t('login.genericError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <PublicHeader />
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('login.subtitle')}</p>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700">{t('login.sectionTitle')}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                <Label htmlFor="roomNumber" required>
                  {t('login.room')}
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
                <Label htmlFor="pin" required>
                  {t('login.pin')}
                </Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  autoComplete="off"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </FieldGroup>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" disabled={pending} className="mt-2 w-full">
                {pending ? t('login.submitPending') : t('login.submit')}
              </Button>
            </form>
          </CardBody>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-400">
          {t('login.staffPrompt')} <Link to="/staff" className="underline hover:text-slate-600">{t('login.staffLink')}</Link>
        </p>
      </div>
    </div>
  )
}
