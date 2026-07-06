import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useReceiptSoundAlert } from '@/hooks/useReceiptSoundAlert'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/imoveis': 'Imóveis',
  '/veiculos': 'Veículos',
  '/equipamentos': 'Equipamentos',
  '/proprietarios': 'Proprietários',
  '/inquilinos': 'Inquilinos',
  '/contratos': 'Contratos',
  '/financeiro': 'Controle Financeiro',
  '/cobrancas': 'Cobranças',
  '/inadimplencia': 'Inadimplência',
  '/advertencias': 'Advertências',
  '/despesas': 'Despesas Compartilhadas',
  '/chamados': 'Chamados e Manutenções',
  '/notificacoes': 'Notificações',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const canHearReceiptAlerts =
    user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'proprietario'

  useReceiptSoundAlert(companyId, canHearReceiptAlerts)

  const currentTitle =
    Object.entries(pageTitles).find(([path]) => location.pathname.startsWith(path))?.[1] ??
    'AlugaPro'

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
