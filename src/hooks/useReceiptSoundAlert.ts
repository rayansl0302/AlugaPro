import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCharges } from '@/services/charges'
import { playNotificationSound } from '@/lib/notificationSound'

export function useReceiptSoundAlert(companyId: string, enabled: boolean) {
  const knownIdsRef = useRef<Set<string> | null>(null)

  const { data: charges = [] } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: enabled && !!companyId,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!enabled) return

    const pendingIds = charges
      .filter((charge) => charge.receiptStatus === 'aguardando')
      .map((charge) => charge.id)

    const current = new Set(pendingIds)

    if (knownIdsRef.current === null) {
      knownIdsRef.current = current
      return
    }

    const hasNew = pendingIds.some((id) => !knownIdsRef.current!.has(id))
    if (hasNew) {
      playNotificationSound()
    }

    knownIdsRef.current = current
  }, [charges, enabled])
}
