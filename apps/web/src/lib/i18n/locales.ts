export type Locale = 'it' | 'en' | 'fr' | 'de' | 'es' | 'pt'

export const DEFAULT_LOCALE: Locale = 'it'

export const LOCALES: { code: Locale; flag: string; label: string }[] = [
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
]

export function isLocale(value: string): value is Locale {
  return LOCALES.some((l) => l.code === value)
}
