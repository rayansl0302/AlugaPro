import { useEffect, useMemo, useState } from 'react'

export interface PaginationResult<T> {
  page: number
  setPage: (page: number) => void
  totalPages: number
  total: number
  pageSize: number
  pageItems: T[]
  rangeStart: number
  rangeEnd: number
}

export function usePagination<T>(items: T[], pageSize = 10): PaginationResult<T> {
  const [page, setPage] = useState(1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return { page, setPage, totalPages, total, pageSize, pageItems, rangeStart, rangeEnd }
}
