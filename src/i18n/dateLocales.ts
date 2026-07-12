import { Locale } from 'date-fns'
import { enUS, es, ptBR } from 'date-fns/locale'
import { AppLocale, normalizeLocale } from './locales'

const DATE_LOCALES: Record<AppLocale, Locale> = {
  'pt-BR': ptBR,
  en: enUS,
  es,
}

export function getDateFnsLocale(locale?: string | null): Locale {
  return DATE_LOCALES[normalizeLocale(locale)]
}

export function getNumberLocale(locale?: string | null): string {
  return normalizeLocale(locale)
}
