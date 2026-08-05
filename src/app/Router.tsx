import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/modules/auth/LoginPage'
import { WitnessSignPage } from '@/modules/witness-sign/WitnessSignPage'
import { VerifyDocumentPage } from '@/modules/verify/VerifyDocumentPage'
import { LandingPage } from '@/modules/landing/LandingPage'
import { RecursosPage } from '@/modules/landing/RecursosPage'
import { AfiliadosPage } from '@/modules/landing/AfiliadosPage'
import { TermsPage } from '@/modules/legal/TermsPage'
import { PrivacyPolicyPage } from '@/modules/legal/PrivacyPolicyPage'
import { AccountDeletionPage } from '@/modules/legal/AccountDeletionPage'
import { UnsubscribePage } from '@/modules/legal/UnsubscribePage'
import { ExpiredPage } from '@/modules/subscription/ExpiredPage'
import { SaleSignPage } from '@/modules/sale-sign/SaleSignPage'

// Área autenticada (dashboard, CRUD, financeiro, portal do inquilino, painel
// do afiliado) — carregada sob demanda, só depois do login, pra quem visita
// só as páginas públicas (landing/recursos/afiliados) não baixar esse peso
// todo antes da página ficar interativa (Core Web Vitals / SEO).
const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PropertiesPage = lazy(() => import('@/modules/properties/PropertiesPage').then((m) => ({ default: m.PropertiesPage })))
const VehiclesPage = lazy(() => import('@/modules/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })))
const EquipmentsPage = lazy(() => import('@/modules/equipment/EquipmentsPage').then((m) => ({ default: m.EquipmentsPage })))
const TenantsPage = lazy(() => import('@/modules/tenants/TenantsPage').then((m) => ({ default: m.TenantsPage })))
const ContractsPage = lazy(() => import('@/modules/contracts/ContractsPage').then((m) => ({ default: m.ContractsPage })))
const ContractTemplatesPage = lazy(() => import('@/modules/contract-templates/ContractTemplatesPage').then((m) => ({ default: m.ContractTemplatesPage })))
const FinancialPage = lazy(() => import('@/modules/financial/FinancialPage').then((m) => ({ default: m.FinancialPage })))
const ChargesPage = lazy(() => import('@/modules/charges/ChargesPage').then((m) => ({ default: m.ChargesPage })))
const DefaultersPage = lazy(() => import('@/modules/defaulters/DefaultersPage').then((m) => ({ default: m.DefaultersPage })))
const WarningsPage = lazy(() => import('@/modules/warnings/WarningsPage').then((m) => ({ default: m.WarningsPage })))
const SharedExpensesPage = lazy(() => import('@/modules/shared-expenses/SharedExpensesPage').then((m) => ({ default: m.SharedExpensesPage })))
const MaintenancePage = lazy(() => import('@/modules/maintenance/MaintenancePage').then((m) => ({ default: m.MaintenancePage })))
const NotificationsPage = lazy(() => import('@/modules/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const ReportsPage = lazy(() => import('@/modules/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const OwnersPage = lazy(() => import('@/modules/owners/OwnersPage').then((m) => ({ default: m.OwnersPage })))
const TenantPortal = lazy(() => import('@/modules/tenant-portal/TenantPortal').then((m) => ({ default: m.TenantPortal })))
const TenantContractsPage = lazy(() => import('@/modules/tenant-portal/TenantContractsPage').then((m) => ({ default: m.TenantContractsPage })))
const AffiliatePanel = lazy(() => import('@/modules/affiliate/AffiliatePanel').then((m) => ({ default: m.AffiliatePanel })))
const ProfilePage = lazy(() => import('@/modules/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SubscriptionPage = lazy(() => import('@/modules/subscription/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })))
const WhatsAppPage = lazy(() => import('@/modules/settings/WhatsAppPage').then((m) => ({ default: m.WhatsAppPage })))
const SaleContractsPage = lazy(() => import('@/modules/sale-contracts/SaleContractsPage').then((m) => ({ default: m.SaleContractsPage })))
const QaPanelPage = lazy(() => import('@/modules/qa/QaPanelPage').then((m) => ({ default: m.QaPanelPage })))

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

// Envolve cada página lazy com seu próprio Suspense — assim, ao trocar de
// rota, só o conteúdo daquele slot mostra o spinner (sidebar/topbar do
// AdminLayout continuam montados, sem piscar a tela toda).
const withSuspense = (children: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{children}</Suspense>
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
    path: '/verificar/:verificationId',
    element: <VerifyDocumentPage />,
  },
  {
    path: '/portal',
    element: (
      <TenantRoute>
        <Outlet />
      </TenantRoute>
    ),
    children: [
      { index: true, element: withSuspense(<TenantPortal />) },
      { path: 'contratos', element: withSuspense(<TenantContractsPage />) },
    ],
  },
  {
    path: '/painel-afiliado',
    element: (
      <AffiliateRoute>
        {withSuspense(<AffiliatePanel />)}
      </AffiliateRoute>
    ),
  },
  {
    path: '/perfil',
    element: (
      <ProtectedRoute>
        {withSuspense(<ProfilePage />)}
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
          { path: 'dashboard', element: withSuspense(<DashboardPage />) },
          { path: 'imoveis', element: withSuspense(<PropertiesPage />) },
          { path: 'veiculos', element: withSuspense(<VehiclesPage />) },
          { path: 'equipamentos', element: withSuspense(<EquipmentsPage />) },
          { path: 'proprietarios', element: withSuspense(<OwnersPage />) },
          { path: 'inquilinos', element: withSuspense(<TenantsPage />) },
          { path: 'contratos', element: withSuspense(<ContractsPage />) },
          { path: 'modelos-contrato', element: withSuspense(<ContractTemplatesPage />) },
          { path: 'financeiro', element: withSuspense(<FinancialPage />) },
          { path: 'cobrancas', element: withSuspense(<ChargesPage />) },
          { path: 'inadimplencia', element: withSuspense(<DefaultersPage />) },
          { path: 'advertencias', element: withSuspense(<WarningsPage />) },
          { path: 'despesas', element: withSuspense(<SharedExpensesPage />) },
          { path: 'chamados', element: withSuspense(<MaintenancePage />) },
          { path: 'notificacoes', element: withSuspense(<NotificationsPage />) },
          { path: 'relatorios', element: withSuspense(<ReportsPage />) },
          {
            path: 'configuracoes',
            element: (
              <ProtectedRoute roles={['admin']}>
                {withSuspense(<SettingsPage />)}
              </ProtectedRoute>
            ),
          },
          {
            path: 'configuracoes/assinatura',
            element: (
              <ProtectedRoute roles={['admin', 'gestor']}>
                {withSuspense(<SubscriptionPage />)}
              </ProtectedRoute>
            ),
          },
          {
            path: 'configuracoes/whatsapp',
            element: (
              <ProtectedRoute roles={['admin']}>
                {withSuspense(<WhatsAppPage />)}
              </ProtectedRoute>
            ),
          },
          {
            path: 'contratos-terreno',
            element: (
              <ProtectedRoute roles={['admin']}>
                {withSuspense(<SaleContractsPage />)}
              </ProtectedRoute>
            ),
          },
          {
            path: 'qa',
            element: (
              <ProtectedRoute roles={['admin']}>
                {withSuspense(<QaPanelPage />)}
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
