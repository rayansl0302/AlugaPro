import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { WitnessSignatureRequest } from '@/types'

const COL = 'witnessSignatures'

export function generateWitnessToken(): string {
  // Token é o segredo do link público — precisa ser criptograficamente forte.
  // Fail-closed: sem Web Crypto, é melhor falhar do que gerar token adivinhável.
  const c: Crypto | undefined = globalThis.crypto
  if (!c) throw new Error('Web Crypto indisponível — não é possível gerar token seguro.')
  if (typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '')
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
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
