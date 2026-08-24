import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/i18n/locale-context'
import { autoTranslate } from '@/lib/i18n/auto-translate'

// Renders admin-entered text (category/item names, descriptions…),
// machine-translated into whatever the viewer's locale is. Admin content
// isn't guaranteed to be typed in Italian (staff often just type English
// words), so this always asks for a translation — including when the
// viewer's locale is 'it' — rather than assuming Italian source text and
// skipping the call. Shows the original text immediately and swaps it in
// once translation resolves, so there's never a blank state — a slow or
// failing translation just stays as typed.
export function AutoText({ text, className }: { text: string; className?: string }) {
  const { locale } = useLocale()
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    setDisplay(text)
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
