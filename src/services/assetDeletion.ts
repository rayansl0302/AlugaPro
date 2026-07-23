import { Contract } from '@/types'
import { getContractsByAsset, deleteContract } from './contracts'
import { deleteOpenChargesForContract } from './charges'
import { deleteWarningsByContract } from './warnings'
import { deleteOpenMaintenanceForAsset } from './maintenance'
import { deleteOpenSharedExpensesForAsset } from './sharedExpenses'
import { getTenants, updateTenant } from './tenants'

// Orquestra a exclusão de um ativo (imóvel/veículo/equipamento) sem deixar
// nenhum registro órfão no ecossistema. Regras de negócio (escolhidas pelo
// usuário):
//  - Bloqueia a exclusão se houver contrato VIGENTE (ativo/renovado) — o
//    usuário precisa encerrar o contrato antes.
//  - Ao excluir, remove os contratos (encerrados) do ativo e os registros
//    EM ABERTO vinculados: cobranças pendentes/atrasadas, chamados não
//    finalizados e despesas não quitadas. O que já foi pago/finalizado fica
//    como histórico. Advertências (atreladas ao contrato) são removidas.
//    O vínculo do inquilino ao contrato/ativo excluído também é limpo.

export { getContractsByAsset }

export function hasActiveContract(contracts: Contract[]): boolean {
  return contracts.some((c) => c.status === 'ativo' || c.status === 'renovado')
}

export interface AssetDeletionCleanup {
  contracts: number
  charges: number
  warnings: number
  maintenance: number
  sharedExpenses: number
}

/** Remove contratos do ativo e todos os registros em aberto vinculados.
 *  NÃO valida contrato ativo (o chamador deve checar com hasActiveContract). */
export async function deleteAssetRelations(
  companyId: string,
  assetId: string,
  contracts: Contract[],
): Promise<AssetDeletionCleanup> {
  const result: AssetDeletionCleanup = { contracts: 0, charges: 0, warnings: 0, maintenance: 0, sharedExpenses: 0 }

  // 1) Por contrato: cobranças em aberto + advertências + o próprio contrato.
  for (const c of contracts) {
    result.charges += await deleteOpenChargesForContract(c.id)
    result.warnings += await deleteWarningsByContract(c.id)
    await deleteContract(c.id)
    result.contracts += 1
  }

  // 2) Registros ligados diretamente ao ativo (não ao contrato).
  result.maintenance = await deleteOpenMaintenanceForAsset(companyId, assetId)
  result.sharedExpenses = await deleteOpenSharedExpensesForAsset(companyId, assetId)

  // 3) Limpa o vínculo do inquilino que apontava pro contrato/ativo excluído.
  //    Só limpa se ainda apontar pra algo que estamos removendo (não mexe se
  //    o inquilino já tem um contrato novo).
  const deletedContractIds = new Set(contracts.map((c) => c.id))
  const tenants = await getTenants(companyId)
  await Promise.all(
    tenants.map(async (t) => {
      const patch: { activeContractId?: string; activePropertyId?: string } = {}
      if (t.activeContractId && deletedContractIds.has(t.activeContractId)) patch.activeContractId = ''
      if (t.activePropertyId === assetId) patch.activePropertyId = ''
      if (Object.keys(patch).length > 0) await updateTenant(t.id, patch)
    }),
  )

  return result
}
