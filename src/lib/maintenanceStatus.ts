import type { MaintenanceStatus } from '@/types'

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

export const maintenanceStatusBadgeVariant: Record<
  MaintenanceStatus,
  'info' | 'warning' | 'secondary' | 'success'
> = {
  aberto: 'info',
  em_analise: 'warning',
  em_andamento: 'secondary',
  finalizado: 'success',
}
