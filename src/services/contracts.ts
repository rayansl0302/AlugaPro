import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Contract, ContractAssetType, Property, Vehicle, Equipment } from '@/types'
import { generateContractNumber } from '@/lib/utils'
import { updateProperty } from './properties'
import { updateVehicle } from './vehicles'
import { updateEquipment } from './equipments'
import { updateTenant } from './tenants'

const COL = 'contracts'

interface AssetRef {
  assetType: ContractAssetType
  assetId: string
}

export async function linkContractToAsset(
  ref: AssetRef,
  opts: { contractId: string; tenantId: string; tenantName?: string; setRented?: boolean }
): Promise<void> {
  if (!ref.assetId) return

  if (ref.assetType === 'veiculo') {
    const patch: Partial<Vehicle> = {
      activeContractId: opts.contractId,
      activeTenantId: opts.tenantId,
      activeTenantName: opts.tenantName ?? '',
    }
    if (opts.setRented) patch.status = 'alugado'
    await updateVehicle(ref.assetId, patch)
  } else if (ref.assetType === 'equipamento') {
    const patch: Partial<Equipment> = {
      activeContractId: opts.contractId,
      activeTenantId: opts.tenantId,
      activeTenantName: opts.tenantName ?? '',
    }
    if (opts.setRented) patch.status = 'alugado'
    await updateEquipment(ref.assetId, patch)
  } else {
    const patch: Partial<Property> = {
      activeContractId: opts.contractId,
      activeTenantId: opts.tenantId,
      activeTenantName: opts.tenantName ?? '',
    }
    if (opts.setRented) patch.status = 'alugado'
    await updateProperty(ref.assetId, patch)
  }

  if (opts.tenantId) {
    await updateTenant(opts.tenantId, {
      activeContractId: opts.contractId,
      activePropertyId: ref.assetId,
    })
  }
}

export async function releaseContractAsset(ref: AssetRef, tenantId?: string): Promise<void> {
  if (!ref.assetId) return

  const cleared = {
    status: 'disponivel' as const,
    activeContractId: '',
    activeTenantId: '',
    activeTenantName: '',
  }
  if (ref.assetType === 'veiculo') {
    await updateVehicle(ref.assetId, cleared)
  } else if (ref.assetType === 'equipamento') {
    await updateEquipment(ref.assetId, cleared)
  } else {
    await updateProperty(ref.assetId, cleared)
  }

  if (tenantId) {
    await updateTenant(tenantId, { activeContractId: '', activePropertyId: '' })
  }
}

export async function getContracts(companyId: string): Promise<Contract[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Contract))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getContract(id: string): Promise<Contract | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Contract
}

export async function createContract(
  data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'contractNumber'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    contractNumber: generateContractNumber(),
    status: 'ativo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

// Contratos vinculados a um ativo (imóvel/veículo/equipamento). O id do ativo
// fica sempre em propertyId, independente do assetType.
export async function getContractsByAsset(companyId: string, assetId: string): Promise<Contract[]> {
  const all = await getContracts(companyId)
  return all.filter((c) => c.propertyId === assetId)
}

export async function getContractsByTenant(
  companyId: string,
  tenantId: string
): Promise<Contract[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('tenantId', '==', tenantId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Contract))
}
