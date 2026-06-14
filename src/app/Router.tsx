import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/modules/auth/LoginPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { PropertiesPage } from '@/modules/properties/PropertiesPage'
import { VehiclesPage } from '@/modules/vehicles/VehiclesPage'
import { TenantsPage } from '@/modules/tenants/TenantsPage'
import { ContractsPage } from '@/modules/contracts/ContractsPage'
import { ContractTemplatesPage } from '@/modules/contract-templates/ContractTemplatesPage'
import { FinancialPage } from '@/modules/financial/FinancialPage'
import { ChargesPage } from '@/modules/charges/ChargesPage'
import { DefaultersPage } from '@/modules/defaulters/DefaultersPage'
import { SharedExpensesPage } from '@/modules/shared-expenses/SharedExpensesPage'
import { MaintenancePage } from '@/modules/maintenance/MaintenancePage'
import { NotificationsPage } from '@/modules/notifications/NotificationsPage'
import { ReportsPage } from '@/modules/reports/ReportsPage'
import { SettingsPage } from '@/modules/settings/SettingsPage'
import { OwnersPage } from '@/modules/owners/OwnersPage'
import { TenantPortal } from '@/modules/tenant-portal/TenantPortal'
import { WitnessSignPage } from '@/modules/witness-sign/WitnessSignPage'
import { ProfilePage } from '@/modules/profile/ProfilePage'
import { LandingPage } from '@/modules/landing/LandingPage'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

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
    path: '/portal',
    element: (
      <TenantRoute>
        <TenantPortal />
      </TenantRoute>
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
    path: '/',
    children: [
      { index: true, element: <LandingPage /> },
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
          { path: 'proprietarios', element: <OwnersPage /> },
          { path: 'inquilinos', element: <TenantsPage /> },
          { path: 'contratos', element: <ContractsPage /> },
          { path: 'modelos-contrato', element: <ContractTemplatesPage /> },
          { path: 'financeiro', element: <FinancialPage /> },
          { path: 'cobrancas', element: <ChargesPage /> },
          { path: 'inadimplencia', element: <DefaultersPage /> },
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
