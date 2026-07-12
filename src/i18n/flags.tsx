import { AppLocale } from './locales'

interface FlagProps {
  className?: string
}

function BrazilFlag({ className }: FlagProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" fill="#009c3b" />
      <path d="M12 3.5 21 12l-9 8.5L3 12z" fill="#ffdf00" />
      <circle cx="12" cy="12" r="3.6" fill="#002776" />
    </svg>
  )
}

function USAFlag({ className }: FlagProps) {
  const stripeHeight = 24 / 13
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 2 * stripeHeight} width="24" height={stripeHeight} fill="#b22234" />
      ))}
      <rect width="10.5" height={stripeHeight * 7} fill="#3c3b6e" />
    </svg>
  )
}

function SpainFlag({ className }: FlagProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" fill="#c60b1e" />
      <rect y="6" width="24" height="12" fill="#ffc400" />
    </svg>
  )
}

const FLAGS: Record<AppLocale, (props: FlagProps) => JSX.Element> = {
  'pt-BR': BrazilFlag,
  en: USAFlag,
  es: SpainFlag,
}

export function FlagIcon({ locale, className }: { locale: AppLocale; className?: string }) {
  const Flag = FLAGS[locale]
  return <Flag className={className} />
}
