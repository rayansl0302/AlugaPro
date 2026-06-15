import { Loader2 } from 'lucide-react'
import type { MaintenanceComment } from '@/types'
import { formatDate } from '@/lib/utils'
import {
  getCommentRoleBadgeClass,
  getCommentRoleLabel,
  resolveCommentRole,
} from '@/lib/maintenanceComments'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface MaintenanceCommentsPanelProps {
  comments: MaintenanceComment[]
  tenantId: string
  tenantName?: string
  commentText: string
  onCommentTextChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
  canComment?: boolean
  inputId?: string
  placeholder?: string
}

function formatCommentDate(comment: MaintenanceComment) {
  if (!comment.createdAt) return ''
  const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(String(comment.createdAt))
  return formatDate(date.toISOString())
}

export function MaintenanceCommentsPanel({
  comments,
  tenantId,
  tenantName,
  commentText,
  onCommentTextChange,
  onSubmit,
  loading = false,
  canComment = true,
  inputId = 'maintenance-comment',
  placeholder = 'Escreva um comentário...',
}: MaintenanceCommentsPanelProps) {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border bg-muted/20 lg:max-h-[min(70vh,560px)]">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Comentários</p>
        <p className="text-xs text-muted-foreground">{comments.length} mensagem(ns)</p>
      </div>

      <div className="min-h-[200px] flex-1 space-y-2 overflow-y-auto p-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum comentário ainda.
          </p>
        ) : (
          comments.map((comment) => {
            const role = resolveCommentRole(comment, { tenantId, tenantName })
            return (
              <div
                key={comment.id}
                className="rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCommentRoleBadgeClass(role)}`}
                  >
                    {getCommentRoleLabel(role)}
                  </span>
                  <span className="font-medium text-xs">{comment.authorName}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                    {formatCommentDate(comment)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.message}</p>
              </div>
            )
          })
        )}
      </div>

      {canComment && (
        <div className="space-y-2 border-t p-3">
          <Label htmlFor={inputId} className="text-xs">Novo comentário</Label>
          <textarea
            id={inputId}
            className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={placeholder}
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
          />
          <Button
            className="w-full"
            size="sm"
            disabled={!commentText.trim() || loading}
            onClick={onSubmit}
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              : 'Enviar comentário'
            }
          </Button>
        </div>
      )}
    </div>
  )
}
