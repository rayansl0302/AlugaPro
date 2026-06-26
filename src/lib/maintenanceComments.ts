import type { MaintenanceComment, UserRole } from '@/types'

const roleLabels: Record<UserRole, string> = {
  inquilino: 'Inquilino',
  gestor: 'Gestor',
  proprietario: 'Proprietário',
  admin: 'Administrador',
  afiliado: 'Afiliado',
}

const roleBadgeClass: Record<UserRole, string> = {
  inquilino: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  gestor: 'bg-primary/10 text-primary',
  proprietario: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  admin: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  afiliado: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

export function resolveCommentRole(
  comment: MaintenanceComment,
  options: { tenantId: string; tenantName?: string },
): UserRole {
  const tenantName = options.tenantName?.trim().toLowerCase()
  const authorName = comment.authorName?.trim().toLowerCase()
  const isTenantByName = !!(tenantName && authorName && tenantName === authorName)

  if (comment.authorRole === 'inquilino' || comment.authorId === options.tenantId || isTenantByName) {
    return 'inquilino'
  }

  if (comment.authorRole) return comment.authorRole

  return 'gestor'
}

export function resolveHistoryRole(
  entry: { changedById: string; changedByName: string; changedByRole?: UserRole },
  options: { tenantId: string; tenantName?: string },
): UserRole {
  const tenantName = options.tenantName?.trim().toLowerCase()
  const authorName = entry.changedByName?.trim().toLowerCase()
  const isTenantByName = !!(tenantName && authorName && tenantName === authorName)

  if (entry.changedByRole === 'inquilino' || entry.changedById === options.tenantId || isTenantByName) {
    return 'inquilino'
  }

  if (entry.changedByRole) return entry.changedByRole

  return 'gestor'
}

export function getCommentRoleLabel(role: UserRole): string {
  return roleLabels[role]
}

export function getCommentRoleBadgeClass(role: UserRole): string {
  return roleBadgeClass[role]
}
