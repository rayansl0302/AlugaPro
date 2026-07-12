import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useReceiptSoundAlert } from '@/hooks/useReceiptSoundAlert'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'

const pageTitleKeys: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/imoveis': 'properties',
  '/veiculos': 'vehicles',
  '/equipamentos': 'equipment',
  '/proprietarios': 'owners',
  '/inquilinos': 'tenants',
  '/contratos': 'contracts',
  '/financeiro': 'financial',
  '/cobrancas': 'charges',
  '/inadimplencia': 'defaulters',
  '/advertencias': 'warnings',
  '/despesas': 'sharedExpenses',
  '/chamados': 'maintenance',
  '/notificacoes': 'notifications',
  '/relatorios': 'reports',
  '/configuracoes': 'settings',
  '/perfil': 'profile',
  '/modelos-contrato': 'contractTemplates',
  '/contratos-terreno': 'saleContracts',
}

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation('nav')
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const canHearReceiptAlerts =
    user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'proprietario'

  useReceiptSoundAlert(companyId, canHearReceiptAlerts)

  const titleKey =
    Object.entries(pageTitleKeys).find(([path]) => location.pathname.startsWith(path))?.[1]
  const currentTitle = titleKey ? t(titleKey) : 'AlugaPro'

  return (
    <div className="pt-safe pb-safe flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={currentTitle} onMenuClick={() => setMobileNavOpen(true)} />
        <SubscriptionBanner />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
