import { Contract } from '@/types'

export type ContractSigningState = 'unsigned' | 'pending' | 'complete'

export interface ContractSigningStatus {
  state: ContractSigningState
  locadorSigned: boolean
  locatarioSigned: boolean
  witnessesTotal: number
  witnessesSigned: number
  pendingCount: number
}

export function getContractSigningStatus(contract: Contract): ContractSigningStatus {
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
