import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { APP_LOCALES, LOCALE_STORAGE_KEY, normalizeLocale } from './locales'

import ptCommon from './locales/pt-BR/common.json'
import ptNav from './locales/pt-BR/nav.json'
import ptAuth from './locales/pt-BR/auth.json'
import ptProfile from './locales/pt-BR/profile.json'
import ptSubscription from './locales/pt-BR/subscription.json'
import ptLanding from './locales/pt-BR/landing.json'
import ptLegal from './locales/pt-BR/legal.json'
import ptPortal from './locales/pt-BR/portal.json'
import ptAffiliate from './locales/pt-BR/affiliate.json'
import ptDashboard from './locales/pt-BR/dashboard.json'
import ptProperties from './locales/pt-BR/properties.json'
import ptVehicles from './locales/pt-BR/vehicles.json'
import ptEquipment from './locales/pt-BR/equipment.json'
import ptOwners from './locales/pt-BR/owners.json'
import ptTenants from './locales/pt-BR/tenants.json'
import ptContracts from './locales/pt-BR/contracts.json'
import ptCharges from './locales/pt-BR/charges.json'
import ptFinancial from './locales/pt-BR/financial.json'
import ptMaintenance from './locales/pt-BR/maintenance.json'
import ptReports from './locales/pt-BR/reports.json'
import ptSettings from './locales/pt-BR/settings.json'
import ptNotifications from './locales/pt-BR/notifications.json'
import ptWarnings from './locales/pt-BR/warnings.json'
import ptSaleContracts from './locales/pt-BR/saleContracts.json'
import ptSharedExpenses from './locales/pt-BR/sharedExpenses.json'

import enCommon from './locales/en/common.json'
import enNav from './locales/en/nav.json'
import enAuth from './locales/en/auth.json'
import enProfile from './locales/en/profile.json'
import enSubscription from './locales/en/subscription.json'
import enLanding from './locales/en/landing.json'
import enLegal from './locales/en/legal.json'
import enPortal from './locales/en/portal.json'
import enAffiliate from './locales/en/affiliate.json'
import enDashboard from './locales/en/dashboard.json'
import enProperties from './locales/en/properties.json'
import enVehicles from './locales/en/vehicles.json'
import enEquipment from './locales/en/equipment.json'
import enOwners from './locales/en/owners.json'
import enTenants from './locales/en/tenants.json'
import enContracts from './locales/en/contracts.json'
import enCharges from './locales/en/charges.json'
import enFinancial from './locales/en/financial.json'
import enMaintenance from './locales/en/maintenance.json'
import enReports from './locales/en/reports.json'
import enSettings from './locales/en/settings.json'
import enNotifications from './locales/en/notifications.json'
import enWarnings from './locales/en/warnings.json'
import enSaleContracts from './locales/en/saleContracts.json'
import enSharedExpenses from './locales/en/sharedExpenses.json'

import esCommon from './locales/es/common.json'
import esNav from './locales/es/nav.json'
import esAuth from './locales/es/auth.json'
import esProfile from './locales/es/profile.json'
import esSubscription from './locales/es/subscription.json'
import esLanding from './locales/es/landing.json'
import esLegal from './locales/es/legal.json'
import esPortal from './locales/es/portal.json'
import esAffiliate from './locales/es/affiliate.json'
import esDashboard from './locales/es/dashboard.json'
import esProperties from './locales/es/properties.json'
import esVehicles from './locales/es/vehicles.json'
import esEquipment from './locales/es/equipment.json'
import esOwners from './locales/es/owners.json'
import esTenants from './locales/es/tenants.json'
import esContracts from './locales/es/contracts.json'
import esCharges from './locales/es/charges.json'
import esFinancial from './locales/es/financial.json'
import esMaintenance from './locales/es/maintenance.json'
import esReports from './locales/es/reports.json'
import esSettings from './locales/es/settings.json'
import esNotifications from './locales/es/notifications.json'
import esWarnings from './locales/es/warnings.json'
import esSaleContracts from './locales/es/saleContracts.json'
import esSharedExpenses from './locales/es/sharedExpenses.json'

export const i18nNamespaces = [
  'common',
  'nav',
  'auth',
  'profile',
  'subscription',
  'landing',
  'legal',
  'portal',
  'affiliate',
  'dashboard',
  'properties',
  'vehicles',
  'equipment',
  'owners',
  'tenants',
  'contracts',
  'charges',
  'financial',
  'maintenance',
  'reports',
  'settings',
  'notifications',
  'warnings',
  'saleContracts',
  'sharedExpenses',
] as const

const resources = {
  'pt-BR': {
    common: ptCommon,
    nav: ptNav,
    auth: ptAuth,
    profile: ptProfile,
    subscription: ptSubscription,
    landing: ptLanding,
    legal: ptLegal,
    portal: ptPortal,
    affiliate: ptAffiliate,
    dashboard: ptDashboard,
    properties: ptProperties,
    vehicles: ptVehicles,
    equipment: ptEquipment,
    owners: ptOwners,
    tenants: ptTenants,
    contracts: ptContracts,
    charges: ptCharges,
    financial: ptFinancial,
    maintenance: ptMaintenance,
    reports: ptReports,
    settings: ptSettings,
    notifications: ptNotifications,
    warnings: ptWarnings,
    saleContracts: ptSaleContracts,
    sharedExpenses: ptSharedExpenses,
  },
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    profile: enProfile,
    subscription: enSubscription,
    landing: enLanding,
    legal: enLegal,
    portal: enPortal,
    affiliate: enAffiliate,
    dashboard: enDashboard,
    properties: enProperties,
    vehicles: enVehicles,
    equipment: enEquipment,
    owners: enOwners,
    tenants: enTenants,
    contracts: enContracts,
    charges: enCharges,
    financial: enFinancial,
    maintenance: enMaintenance,
    reports: enReports,
    settings: enSettings,
    notifications: enNotifications,
    warnings: enWarnings,
    saleContracts: enSaleContracts,
    sharedExpenses: enSharedExpenses,
  },
  es: {
    common: esCommon,
    nav: esNav,
    auth: esAuth,
    profile: esProfile,
    subscription: esSubscription,
    landing: esLanding,
    legal: esLegal,
    portal: esPortal,
    affiliate: esAffiliate,
    dashboard: esDashboard,
    properties: esProperties,
    vehicles: esVehicles,
    equipment: esEquipment,
    owners: esOwners,
    tenants: esTenants,
    contracts: esContracts,
    charges: esCharges,
    financial: esFinancial,
    maintenance: esMaintenance,
    reports: esReports,
    settings: esSettings,
    notifications: esNotifications,
    warnings: esWarnings,
    saleContracts: esSaleContracts,
    sharedExpenses: esSharedExpenses,
  },
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    supportedLngs: [...APP_LOCALES],
    ns: [...i18nNamespaces],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      // Visitante novo (sem escolha salva): detecta pelo idioma do navegador.
      // Ordem: preferência salva → idioma(s) do navegador → htmlTag → fallback.
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: (lng) => normalizeLocale(lng),
    },
    react: { useSuspense: false },
  })

// Mantém o atributo lang do <html> em sincronia (acessibilidade / SEO).
function syncDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeLocale(lng)
  }
}
syncDocumentLang(i18n.language)
i18n.on('languageChanged', syncDocumentLang)

export default i18n

