import { Contract } from '@/types'
import { getContractsByAsset, deleteContract } from './contracts'
import { deleteOpenChargesForContract } from './charges'

// Orquestra a exclusão de um ativo (imóvel/veículo/equipamento) sem deixar
// contratos e cobranças órfãos. Regras de negócio (escolhidas pelo usuário):
//  - Bloqueia a exclusão se houver contrato VIGENTE (ativo/renovado) — o
//    usuário precisa encerrar o contrato antes.
//  - Ao excluir, remove os contratos (encerrados) do ativo e as cobranças
//    EM ABERTO deles; cobranças pagas ficam como histórico de receita.

export { getContractsByAsset }

export function hasActiveContract(contracts: Contract[]): boolean {
  return contracts.some((c) => c.status === 'ativo' || c.status === 'renovado')
}

/** Remove contratos do ativo + cobranças em aberto. NÃO valida contrato ativo
 *  (o chamador deve checar antes com hasActiveContract). */
export async function deleteAssetRelations(contracts: Contract[]): Promise<{ contracts: number; charges: number }> {
  let charges = 0
  for (const c of contracts) {
    charges += await deleteOpenChargesForContract(c.id)
    await deleteContract(c.id)
  }
  return { contracts: contracts.length, charges }
}
