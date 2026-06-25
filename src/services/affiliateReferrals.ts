import {
  collection, doc, setDoc, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AffiliateReferral } from '@/types'

const COL = 'affiliateReferrals'

export async function getReferralsByCode(code: string): Promise<AffiliateReferral[]> {
  const q = query(collection(db, COL), where('code', '==', code))
  const snap = await getDocs(q)
  const referrals = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AffiliateReferral))
  return referrals.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function createReferral(companyId: string, code: string, companyName: string): Promise<void> {
  await setDoc(doc(db, COL, companyId), {
    code,
    companyId,
    companyName,
    createdAt: serverTimestamp(),
  })
}
