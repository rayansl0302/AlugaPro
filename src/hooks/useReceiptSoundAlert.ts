import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCharges } from '@/services/charges'
import { getSharedExpenses } from '@/services/sharedExpenses'
import { buildPendingReceiptKeys } from '@/lib/pendingReceipts'
import { playNotificationSound } from '@/lib/notificationSound'

const RECEIPT_REFETCH_MS = 15_000

export function useReceiptSoundAlert(companyId: string, enabled: boolean) {
  const knownKeysRef = useRef<Set<string> | null>(null)

  const { data: charges = [] } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: enabled && !!companyId,
    refetchInterval: RECEIPT_REFETCH_MS,
  })

  const { data: expenses = [] } = useQuery({
    queryKey: ['sharedExpenses', companyId],
    queryFn: () => getSharedExpenses(companyId),
    enabled: enabled && !!companyId,
    refetchInterval: RECEIPT_REFETCH_MS,
  })

  useEffect(() => {
    if (!enabled) return

    const pendingKeys = buildPendingReceiptKeys(charges, expenses)
    const current = new Set(pendingKeys)

    if (knownKeysRef.current === null) {
      knownKeysRef.current = current
      return
    }

    const hasNew = pendingKeys.some((key) => !knownKeysRef.current!.has(key))
    if (hasNew) {
      playNotificationSound()
    }

    knownKeysRef.current = current
  }, [charges, expenses, enabled])
}
