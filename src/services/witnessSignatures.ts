import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { WitnessSignatureRequest } from '@/types'

const COL = 'witnessSignatures'

export function generateWitnessToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export async function createWitnessRequest(
  token: string,
  data: Omit<WitnessSignatureRequest, 'id' | 'status' | 'createdAt'>
): Promise<void> {
  await setDoc(doc(db, COL, token), {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
}

export async function getWitnessRequest(token: string): Promise<WitnessSignatureRequest | null> {
  const snap = await getDoc(doc(db, COL, token))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as WitnessSignatureRequest
}

export async function submitWitnessSignature(
  token: string,
  payload: { signature: string; cpf: string; rg: string }
): Promise<void> {
  await updateDoc(doc(db, COL, token), {
    signature: payload.signature,
    cpf: payload.cpf,
    rg: payload.rg,
    status: 'signed',
    signedAt: new Date().toISOString(),
  })
}
