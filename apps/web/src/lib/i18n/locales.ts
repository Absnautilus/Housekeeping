export type Locale = 'it' | 'en' | 'fr' | 'de' | 'es' | 'pt'

export const DEFAULT_LOCALE: Locale = 'it'

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
]

export function isLocale(value: string): value is Locale {
  return LOCALES.some((l) => l.code === value)
}
