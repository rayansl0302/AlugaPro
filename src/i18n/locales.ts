export const APP_LOCALES = ['pt-BR', 'en', 'es'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'alugapro_locale'

export const LOCALE_LABELS: Record<AppLocale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (APP_LOCALES as readonly string[]).includes(value)
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
  if (!value) return 'pt-BR'
  if (isAppLocale(value)) return value
  const lower = value.toLowerCase()
  if (lower.startsWith('pt')) return 'pt-BR'
  if (lower.startsWith('es')) return 'es'
  if (lower.startsWith('en')) return 'en'
  return 'pt-BR'
}
