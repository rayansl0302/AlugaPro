import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/modules/auth/LoginPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { PropertiesPage } from '@/modules/properties/PropertiesPage'
import { VehiclesPage } from '@/modules/vehicles/VehiclesPage'
import { EquipmentsPage } from '@/modules/equipment/EquipmentsPage'
import { TenantsPage } from '@/modules/tenants/TenantsPage'
import { ContractsPage } from '@/modules/contracts/ContractsPage'
import { ContractTemplatesPage } from '@/modules/contract-templates/ContractTemplatesPage'
import { FinancialPage } from '@/modules/financial/FinancialPage'
import { ChargesPage } from '@/modules/charges/ChargesPage'
import { DefaultersPage } from '@/modules/defaulters/DefaultersPage'
import { WarningsPage } from '@/modules/warnings/WarningsPage'
import { SharedExpensesPage } from '@/modules/shared-expenses/SharedExpensesPage'
import { MaintenancePage } from '@/modules/maintenance/MaintenancePage'
import { NotificationsPage } from '@/modules/notifications/NotificationsPage'
import { ReportsPage } from '@/modules/reports/ReportsPage'
import { SettingsPage } from '@/modules/settings/SettingsPage'
import { OwnersPage } from '@/modules/owners/OwnersPage'
import { TenantPortal } from '@/modules/tenant-portal/TenantPortal'
import { TenantContractsPage } from '@/modules/tenant-portal/TenantContractsPage'
import { AffiliatePanel } from '@/modules/affiliate/AffiliatePanel'
import { WitnessSignPage } from '@/modules/witness-sign/WitnessSignPage'
import { ProfilePage } from '@/modules/profile/ProfilePage'
import { LandingPage } from '@/modules/landing/LandingPage'
import { RecursosPage } from '@/modules/landing/RecursosPage'
import { AfiliadosPage } from '@/modules/landing/AfiliadosPage'
import { TermsPage } from '@/modules/legal/TermsPage'
import { PrivacyPolicyPage } from '@/modules/legal/PrivacyPolicyPage'
import { AccountDeletionPage } from '@/modules/legal/AccountDeletionPage'
import { UnsubscribePage } from '@/modules/legal/UnsubscribePage'
import { EmailMarketingPage } from '@/modules/email-marketing/EmailMarketingPage'
import { SubscriptionPage } from '@/modules/subscription/SubscriptionPage'
import { ExpiredPage } from '@/modules/subscription/ExpiredPage'
import { WhatsAppPage } from '@/modules/settings/WhatsAppPage'
import { SaleContractsPage } from '@/modules/sale-contracts/SaleContractsPage'
import { SaleSignPage } from '@/modules/sale-sign/SaleSignPage'

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth()
  const { hasAccess, isLoading: subLoading, status, isAdmin } = useSubscription()

  if (loading || subLoading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />

  // Bloqueia acesso total quando expirado (exceto admin AlugaPro e página de assinatura)
  if (!isAdmin && status === 'expired') return <ExpiredPage />

  return <>{children}</>
}

function TenantRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'inquilino') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AffiliateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'afiliado') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/assinar-testemunha/:token',
    element: <WitnessSignPage />,
  },
  {
    path: '/assinar-venda/:token',
    element: <SaleSignPage />,
  },
  {
    path: '/portal',
    element: (
      <TenantRoute>
        <Outlet />
      </TenantRoute>
    ),
    children: [
      { index: true, element: <TenantPortal /> },
      { path: 'contratos', element: <TenantContractsPage /> },
    ],
  },
  {
    path: '/painel-afiliado',
    element: (
      <AffiliateRoute>
        <AffiliatePanel />
      </AffiliateRoute>
    ),
  },
  {
    path: '/perfil',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/termos',
    element: <TermsPage />,
  },
  {
    path: '/politica-de-privacidade',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/exclusao-de-conta',
    element: <AccountDeletionPage />,
  },
  {
    path: '/descadastrar',
    element: <UnsubscribePage />,
  },
  {
    path: '/',
    children: [
      // No app nativo (Android/iOS) não existe "site" — a experiência é só
      // login + sistema autenticado (+ termos/privacidade). As páginas
      // públicas de marketing (landing, recursos, afiliados) só existem na
      // versão web.
      Capacitor.isNativePlatform()
        ? { index: true, element: <Navigate to="/login" replace /> }
        : { index: true, element: <LandingPage /> },
      ...(Capacitor.isNativePlatform()
        ? []
        : [
            { path: 'recursos', element: <RecursosPage /> },
            { path: 'afiliados', element: <AfiliadosPage /> },
          ]),
      {
        element: (
          <ProtectedRoute roles={['admin', 'gestor', 'proprietario']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'imoveis', element: <PropertiesPage /> },
          { path: 'veiculos', element: <VehiclesPage /> },
          { path: 'equipamentos', element: <EquipmentsPage /> },
          { path: 'proprietarios', element: <OwnersPage /> },
          { path: 'inquilinos', element: <TenantsPage /> },
          { path: 'contratos', element: <ContractsPage /> },
          { path: 'modelos-contrato', element: <ContractTemplatesPage /> },
          { path: 'financeiro', element: <FinancialPage /> },
          { path: 'cobrancas', element: <ChargesPage /> },
          { path: 'inadimplencia', element: <DefaultersPage /> },
          { path: 'advertencias', element: <WarningsPage /> },
          { path: 'despesas', element: <SharedExpensesPage /> },
          { path: 'chamados', element: <MaintenancePage /> },
          { path: 'notificacoes', element: <NotificationsPage /> },
          { path: 'relatorios', element: <ReportsPage /> },
          {
            path: 'configuracoes',
            element: (
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'configuracoes/assinatura',
            element: (
              <ProtectedRoute roles={['admin', 'gestor']}>
                <SubscriptionPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'configuracoes/whatsapp',
            element: (
              <ProtectedRoute roles={['admin']}>
                <WhatsAppPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'contratos-terreno',
            element: (
              <ProtectedRoute roles={['admin']}>
                <SaleContractsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'email-marketing',
            element: (
              <ProtectedRoute roles={['admin']}>
                <EmailMarketingPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
