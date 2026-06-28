import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { SaleContract, SaleSignatureRequest } from '@/types'

const SALE_CONTRACTS_COL = 'saleContracts'
const SALE_SIGNATURES_COL = 'saleSignatures'

export async function getSaleContracts(): Promise<SaleContract[]> {
  const snap = await getDocs(query(collection(db, SALE_CONTRACTS_COL), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SaleContract))
}

export async function getSaleContract(id: string): Promise<SaleContract | null> {
  const snap = await getDoc(doc(db, SALE_CONTRACTS_COL, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as SaleContract) : null
}

export async function createSaleContract(
  data: Omit<SaleContract, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, SALE_CONTRACTS_COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSaleContract(id: string, data: Partial<SaleContract>): Promise<void> {
  await updateDoc(doc(db, SALE_CONTRACTS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export function generateSaleSignToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export async function createSaleSignatureRequest(
  token: string,
  data: Omit<SaleSignatureRequest, 'id' | 'status' | 'createdAt'>
): Promise<void> {
  await setDoc(doc(db, SALE_SIGNATURES_COL, token), {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
}

export async function getSaleSignatureRequest(token: string): Promise<SaleSignatureRequest | null> {
  const snap = await getDoc(doc(db, SALE_SIGNATURES_COL, token))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as SaleSignatureRequest
}

// Atualiza só os campos de contexto (nomes/objeto/valor) de uma solicitação
// ainda pendente — usado quando o admin edita um contrato e precisa
// refletir os dados novos em links já enviados, sem tocar em status/assinatura.
export async function updateSaleSignatureSnapshot(
  token: string,
  data: { signerName: string; vendedorName: string; compradorName: string; objeto: string; valor: string }
): Promise<void> {
  await updateDoc(doc(db, SALE_SIGNATURES_COL, token), data)
}

export async function deleteSaleSignatureRequest(token: string): Promise<void> {
  await deleteDoc(doc(db, SALE_SIGNATURES_COL, token))
}

export async function submitSaleSignature(
  token: string,
  payload: {
    signature: string
    cpf: string
    rg: string
    documentFrontUrl: string
    documentBackUrl: string
    documentSelfieUrl: string
  }
): Promise<void> {
  await updateDoc(doc(db, SALE_SIGNATURES_COL, token), {
    signature: payload.signature,
    cpf: payload.cpf,
    rg: payload.rg,
    documentFrontUrl: payload.documentFrontUrl,
    documentBackUrl: payload.documentBackUrl,
    documentSelfieUrl: payload.documentSelfieUrl,
    status: 'signed',
    signedAt: new Date().toISOString(),
  })
}
