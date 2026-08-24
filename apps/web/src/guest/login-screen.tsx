import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/logo'
import { LanguageToggle } from '@/components/language-toggle'
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-line bg-surface p-9 shadow-md">
          <div className="mx-auto mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-md bg-accent text-accent-ink shadow-[0_8px_20px_-6px_var(--accent)]">
            <LogoMark className="h-6 w-6" mouthColor="#fff" />
          </div>
          <div className="text-center text-[10px] font-extrabold uppercase tracking-wider text-accent">RoomCall</div>
          <h1 className="text-center font-head text-[19px] font-extrabold text-foreground">{t('login.title')}</h1>
          <p className="mx-auto mt-1.5 max-w-[230px] text-center text-xs leading-relaxed text-muted">{t('login.subtitle')}</p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-3.5">
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
                className="text-center font-mono text-base tracking-[0.5em]"
              />
            </FieldGroup>
            <FieldError>{error ?? undefined}</FieldError>
            <Button type="submit" disabled={pending} className="mt-1 w-full">
              {pending ? t('login.submitPending') : t('login.submit')}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-[11.5px] text-muted">
          {t('login.staffPrompt')} <Link to="/staff" className="font-semibold text-accent hover:underline">{t('login.staffLink')}</Link>
        </p>
        <div className="mt-4 flex justify-center">
          <LanguageToggle />
        </div>
      </div>
    </div>
  )
}
