import { Contract } from '@/types'
import { getContractsByAsset } from './contracts'
import { archivePastDeleteFutureChargesForContract } from './charges'
import { archivePastDeleteFutureSharedExpensesForAsset } from './sharedExpenses'

// Orquestra a exclusão de um ativo (imóvel/veículo/equipamento).
//
// Duas necessidades que parecem conflitar, conciliadas por ARQUIVAMENTO:
//  - Relatórios precisam de TODO o passado (contratos, cobranças pagas e
//    vencidas) — então nada do passado é apagado do banco.
//  - Telas operacionais (dashboard, cobranças, inadimplência) mostram só o
//    que é de ativos existentes — então o passado do ativo excluído é marcado
//    como `archived` e some dessas telas (elas filtram archived).
//
// Só o que é FUTURO e não pago (projeção que deixa de existir junto com o
// ativo) é de fato removido.
//
// A exclusão continua BLOQUEADA se houver contrato vigente (ativo/renovado) —
// encerre o contrato antes.

export { getContractsByAsset }

export function hasActiveContract(contracts: Contract[]): boolean {
  return contracts.some((c) => c.status === 'ativo' || c.status === 'renovado')
}

export interface AssetDeletionCleanup {
  chargesArchived: number
  chargesDeleted: number
  expensesArchived: number
  expensesDeleted: number
}

/** Arquiva o passado e remove o futuro (cobranças e despesas) do ativo.
 *  NÃO valida contrato ativo — o chamador deve checar com hasActiveContract. */
export async function deleteAssetRelations(
  companyId: string,
  assetId: string,
  contracts: Contract[],
): Promise<AssetDeletionCleanup> {
  const result: AssetDeletionCleanup = { chargesArchived: 0, chargesDeleted: 0, expensesArchived: 0, expensesDeleted: 0 }
  for (const c of contracts) {
    const r = await archivePastDeleteFutureChargesForContract(c.id)
    result.chargesArchived += r.archived
    result.chargesDeleted += r.deleted
  }
  const e = await archivePastDeleteFutureSharedExpensesForAsset(companyId, assetId)
  result.expensesArchived = e.archived
  result.expensesDeleted = e.deleted
  return result
}
