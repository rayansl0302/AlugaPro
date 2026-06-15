import type { MaintenanceRequest, MaintenanceStatusHistory } from '@/types'
import { formatDate } from '@/lib/utils'
import { getCommentRoleBadgeClass, getCommentRoleLabel, resolveHistoryRole } from '@/lib/maintenanceComments'
import {
  maintenanceStatusBadgeVariant,
  maintenanceStatusLabels,
} from '@/lib/maintenanceStatus'
import { Badge } from '@/components/ui/badge'

interface MaintenanceStatusHistoryPanelProps {
  request: MaintenanceRequest
}

function formatHistoryDate(entry: MaintenanceStatusHistory) {
  if (!entry.createdAt) return ''
  const date = entry.createdAt.toDate ? entry.createdAt.toDate() : new Date(String(entry.createdAt))
  return formatDate(date.toISOString())
}

export function MaintenanceStatusHistoryPanel({ request }: MaintenanceStatusHistoryPanelProps) {
  const history = [...(request.statusHistory ?? [])].sort(
    (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
  )

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Histórico de status</p>
      <div className="rounded-xl border bg-muted/20 p-3 space-y-3 max-h-48 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant={maintenanceStatusBadgeVariant[request.status]}>
              {maintenanceStatusLabels[request.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">Status atual (sem histórico registrado)</span>
          </div>
        ) : (
          history.map((entry, index) => {
            const role = resolveHistoryRole(entry, {
              tenantId: request.tenantId,
              tenantName: request.tenantName,
            })
            return (
              <div key={entry.id} className="relative pl-4">
                {index < history.length - 1 && (
                  <span className="absolute left-[5px] top-5 bottom-0 w-px bg-border" />
                )}
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={maintenanceStatusBadgeVariant[entry.status]} className="text-xs">
                      {maintenanceStatusLabels[entry.status]}
                    </Badge>
                    {entry.previousStatus && (
                      <span className="text-[11px] text-muted-foreground">
                        de {maintenanceStatusLabels[entry.previousStatus]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCommentRoleBadgeClass(role)}`}
                    >
                      {getCommentRoleLabel(role)}
                    </span>
                    <span className="font-medium">{entry.changedByName}</span>
                    <span className="text-muted-foreground">{formatHistoryDate(entry)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
