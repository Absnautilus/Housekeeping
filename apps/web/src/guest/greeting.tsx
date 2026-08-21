import { useLocale } from '@/lib/i18n/locale-context'
import type { StayInfo } from '@/lib/guest-api'

export function Greeting({ stay }: { stay: StayInfo }) {
  const { t } = useLocale()
  const hour = new Date().getHours()
  const timeOfDay = hour < 18 ? t('greeting.morning') : t('greeting.evening')

  return (
    <div className="mb-5 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">
        {t('greeting.room')} {stay.room_number}
      </span>
      <p className="mt-2 text-sm text-purple-900">
        {timeOfDay} {t('greeting.line', { name: stay.guest_last_name })}
      </p>
    </div>
  )
}
