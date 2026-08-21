import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/i18n/locale-context'
import { autoTranslate } from '@/lib/i18n/auto-translate'

// Renders admin-entered Italian text (category/item names, descriptions…),
// machine-translated into the guest's chosen language. Shows the original
// text immediately and swaps it in once translation resolves, so there's
// never a blank state — a slow or failing translation just stays Italian.
export function AutoText({ text, className }: { text: string; className?: string }) {
  const { locale } = useLocale()
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    setDisplay(text)
    if (locale === 'it') return
    let cancelled = false
    autoTranslate(text, locale).then((translated) => {
      if (!cancelled) setDisplay(translated)
    })
    return () => {
      cancelled = true
    }
  }, [text, locale])

  return <span className={className}>{display}</span>
}
