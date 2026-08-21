import type { Locale } from '@/lib/i18n/locales'

// Hand-drawn flags instead of emoji: flag emoji render as plain two-letter
// codes on some platforms (notably Windows), which isn't what "colored
// flags" means to a hotel guest. This way it's always the actual flag,
// everywhere, with no font or external asset dependency.
function ItalyFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  )
}

function FranceFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="1" height="2" x="0" fill="#0055a4" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ef4135" />
    </svg>
  )
}

function GermanyFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="3" height="0.667" y="0" fill="#000" />
      <rect width="3" height="0.667" y="0.667" fill="#dd0000" />
      <rect width="3" height="0.667" y="1.333" fill="#ffce00" />
    </svg>
  )
}

function SpainFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="3" height="0.5" y="0" fill="#aa151b" />
      <rect width="3" height="1" y="0.5" fill="#f1bf00" />
      <rect width="3" height="0.5" y="1.5" fill="#aa151b" />
    </svg>
  )
}

function PortugalFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="1.2" height="2" x="0" fill="#046a38" />
      <rect width="1.8" height="2" x="1.2" fill="#da020e" />
      <circle cx="1.2" cy="1" r="0.32" fill="#ffce00" />
    </svg>
  )
}

function UkFlag() {
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="60" height="40" fill="#012169" />
      <line x1="0" y1="0" x2="60" y2="40" stroke="#fff" strokeWidth="10" />
      <line x1="60" y1="0" x2="0" y2="40" stroke="#fff" strokeWidth="10" />
      <line x1="0" y1="0" x2="60" y2="40" stroke="#c8102e" strokeWidth="4" />
      <line x1="60" y1="0" x2="0" y2="40" stroke="#c8102e" strokeWidth="4" />
      <rect x="0" y="13" width="60" height="14" fill="#fff" />
      <rect x="23" y="0" width="14" height="40" fill="#fff" />
      <rect x="0" y="17" width="60" height="6" fill="#c8102e" />
      <rect x="27" y="0" width="6" height="40" fill="#c8102e" />
    </svg>
  )
}

const FLAGS: Record<Locale, () => React.JSX.Element> = {
  it: ItalyFlag,
  en: UkFlag,
  fr: FranceFlag,
  de: GermanyFlag,
  es: SpainFlag,
  pt: PortugalFlag,
}

export function FlagIcon({ code, className }: { code: Locale; className?: string }) {
  const Flag = FLAGS[code]
  return (
    <span className={className ? `inline-block overflow-hidden rounded-full ${className}` : 'inline-block overflow-hidden rounded-full'}>
      <Flag />
    </span>
  )
}
