import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ContractVerificationRecord } from '@/types'

const COL = 'contractVerifications'

// Registro público (sem dados sensíveis — nunca inclui IP/dispositivo),
// escrito uma única vez quando o último signatário obrigatório assina um
// contrato de locação ou de venda de terreno. Acessado pelo QR Code impresso
// no PDF final via a página pública /verificar/:verificationId.
export async function createVerificationRecord(
  id: string,
  data: Omit<ContractVerificationRecord, 'id' | 'createdAt'>
): Promise<void> {
  await setDoc(doc(db, COL, id), {
    ...data,
    createdAt: new Date().toISOString(),
  })
}

export async function getVerificationRecord(id: string): Promise<ContractVerificationRecord | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as ContractVerificationRecord
}
