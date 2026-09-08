import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import type { MaintenanceComment } from '@/types'
import { formatDate } from '@/lib/utils'
import {
  getCommentRoleBadgeClass,
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
  placeholder,
}: MaintenanceCommentsPanelProps) {
  const { t } = useTranslation('maintenance')
  return (
    <div className="flex max-h-[400px] min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-muted/20 lg:max-h-[min(70vh,560px)]">
      <div className="shrink-0 border-b px-4 py-3">
        <p className="text-sm font-semibold">{t('commentsPanel.title')}</p>
        <p className="text-xs text-muted-foreground">{t('commentsPanel.messagesCount', { count: comments.length })}</p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('commentsPanel.empty')}
          </p>
        ) : (
          comments.map((comment) => {
            const role = resolveCommentRole(comment, { tenantId, tenantName })
            return (
              <div
                key={comment.id}
                className="min-w-0 rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCommentRoleBadgeClass(role)}`}
                  >
                    {t(`roles.${role}`)}
                  </span>
                  <span className="min-w-0 truncate font-medium text-xs">{comment.authorName}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                    {formatCommentDate(comment)}
                  </span>
                </div>
                <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{comment.message}</p>
              </div>
            )
          })
        )}
      </div>

      {canComment && (
        <div className="min-w-0 shrink-0 space-y-2 border-t p-3">
          <Label htmlFor={inputId} className="text-xs">{t('commentsPanel.newComment')}</Label>
          <textarea
            id={inputId}
            className="box-border flex min-h-[72px] w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={placeholder ?? t('commentsPanel.writeComment')}
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
          />
          <Button
            className="w-full max-w-full"
            size="sm"
            disabled={!commentText.trim() || loading}
            onClick={onSubmit}
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('commentsPanel.sending')}</>
              : t('commentsPanel.send')
            }
          </Button>
        </div>
      )}
    </div>
  )
}
