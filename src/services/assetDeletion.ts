import { Contract } from '@/types'
import { getContractsByAsset } from './contracts'
import { deleteFutureChargesForContract } from './charges'
import { deleteFutureSharedExpensesForAsset } from './sharedExpenses'

// Orquestra a exclusão de um ativo (imóvel/veículo/equipamento).
//
// Princípio: TUDO que é do passado é histórico pra relatórios e NÃO é apagado
// — contratos encerrados, cobranças pagas E vencidas não pagas (inadimplência
// é fato passado), chamados e advertências. Só o que é FUTURO (projeção que
// deixa de existir junto com o ativo) é removido: cobranças e despesas com
// vencimento depois de hoje ainda não pagas.
//
// A exclusão continua BLOQUEADA se houver contrato vigente (ativo/renovado) —
// encerre o contrato antes.

export { getContractsByAsset }

export function hasActiveContract(contracts: Contract[]): boolean {
  return contracts.some((c) => c.status === 'ativo' || c.status === 'renovado')
}

export interface AssetDeletionCleanup {
  charges: number
  sharedExpenses: number
}

/** Remove os lançamentos FUTUROS do ativo (cobranças e despesas ainda não
 *  vencidas). Não toca em nada do passado. NÃO valida contrato ativo — o
 *  chamador deve checar com hasActiveContract. */
export async function deleteAssetRelations(
  companyId: string,
  assetId: string,
  contracts: Contract[],
): Promise<AssetDeletionCleanup> {
  let charges = 0
  for (const c of contracts) {
    charges += await deleteFutureChargesForContract(c.id)
  }
  const sharedExpenses = await deleteFutureSharedExpensesForAsset(companyId, assetId)
  return { charges, sharedExpenses }
}
