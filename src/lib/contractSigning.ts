import { Contract } from '@/types'

// 'external' = contrato importado (PDF de fora), não passa pelo fluxo de
// assinatura digital — trata-se de um documento já assinado no papel/PDF.
export type ContractSigningState = 'unsigned' | 'pending' | 'complete' | 'external'

export interface ContractSigningStatus {
  state: ContractSigningState
  locadorSigned: boolean
  locatarioSigned: boolean
  witnessesTotal: number
  witnessesSigned: number
  pendingCount: number
}

export function getContractSigningStatus(contract: Contract): ContractSigningStatus {
  if (contract.isImported) {
    return {
      state: 'external',
      locadorSigned: true,
      locatarioSigned: true,
      witnessesTotal: 0,
      witnessesSigned: 0,
      pendingCount: 0,
    }
  }

  const locadorSigned = Boolean(contract.signatureLocador)
  const locatarioSigned = Boolean(contract.signatureLocatario)
  const witnesses = contract.witnesses ?? []
  const witnessesTotal = witnesses.length
  const witnessesSigned = witnesses.filter((w) => w.status === 'signed').length

  const started = Boolean(contract.signedAt) || locadorSigned || locatarioSigned

  let pendingCount = 0
  if (!locadorSigned) pendingCount += 1
  if (!locatarioSigned) pendingCount += 1
  pendingCount += witnessesTotal - witnessesSigned

  let state: ContractSigningState = 'unsigned'
  if (started) state = pendingCount > 0 ? 'pending' : 'complete'

  return { state, locadorSigned, locatarioSigned, witnessesTotal, witnessesSigned, pendingCount }
}

export function isContractFullySigned(contract: Contract): boolean {
  return getContractSigningStatus(contract).state === 'complete'
}
