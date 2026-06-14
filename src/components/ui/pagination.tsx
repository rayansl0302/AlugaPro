import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
  className?: string
  itemLabel?: string
}

function pageList(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 1) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

export function Pagination({
  page, totalPages, total, rangeStart, rangeEnd, onPageChange, className, itemLabel = 'itens',
}: PaginationProps) {
  if (total === 0) return null

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{rangeStart}</span>–
        <span className="font-medium text-foreground">{rangeEnd}</span> de{' '}
        <span className="font-medium text-foreground">{total}</span> {itemLabel}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageList(page, totalPages).map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="px-1.5 text-sm text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
