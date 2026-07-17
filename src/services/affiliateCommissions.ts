import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AffiliateCommission } from '@/types'

const COL = 'affiliateCommissions'

// Extrato de comissões do afiliado. Somente leitura no cliente — os
// lançamentos são criados pelo webhook da Asaas e pagos pelo cron (Admin
// SDK). Ordenação client-side pra dispensar índice composto no Firestore.
export async function getCommissionsByAffiliate(affiliateUserId: string): Promise<AffiliateCommission[]> {
  const q = query(collection(db, COL), where('affiliateUserId', '==', affiliateUserId))
  const snap = await getDocs(q)
  const commissions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AffiliateCommission))
  return commissions.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}
