import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { AppLocale, normalizeLocale } from './locales'

export function useLocale() {
  const { i18n } = useTranslation()
  const { setLocale } = useAuth()
  const locale = normalizeLocale(i18n.language)

  return {
    locale,
    setLocale: (next: AppLocale) => setLocale(normalizeLocale(next)),
  }
}
