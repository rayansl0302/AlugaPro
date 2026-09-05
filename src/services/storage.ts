import { uploadToR2 } from './r2'

// Arquivos novos vão pro Cloudflare R2 (uploadToCloudinary permanece em
// cloudinary.ts, sem uso, só pra não perder o código — os arquivos antigos
// continuam servidos normalmente pelas URLs do Cloudinary já salvas no banco,
// nada foi apagado de lá).
export async function uploadFile(
  file: File,
  path: string,
): Promise<string> {
  return uploadToR2(file, path)
}

export async function uploadReceipt(
  companyId: string,
  chargeId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/receipts/${chargeId}_${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadContractDocument(
  companyId: string,
  contractId: string,
  file: File,
  slot: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/contracts/${contractId}/${slot}_${Date.now()}.${ext}`
  return uploadFile(file, path)
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export async function uploadContractPDF(
  companyId: string,
  contractId: string,
  blob: Blob,
  contractNumber?: string,
): Promise<string> {
  const namePart = contractNumber ? slugify(contractNumber) : contractId
  const fileName = `contrato-${namePart}-assinado`
  const path = `companies/${companyId}/contracts/${contractId}/${fileName}_${Date.now()}.pdf`
  const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' })
  return uploadFile(file, path)
}

export async function uploadPropertyPhoto(
  companyId: string,
  propertyId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/properties/${propertyId}/${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadVehiclePhoto(
  companyId: string,
  vehicleId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/vehicles/${vehicleId}/${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadEquipmentPhoto(
  companyId: string,
  equipmentId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/equipments/${equipmentId}/${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadWarningEvidence(
  companyId: string,
  warningId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/warnings/${warningId}/${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadTenantPhoto(
  companyId: string,
  tenantId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/tenants/${tenantId}/photo_${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadSaleContractPDF(
  saleContractId: string,
  blob: Blob,
  contractNumber?: string,
): Promise<string> {
  const namePart = contractNumber ? slugify(contractNumber) : saleContractId
  const fileName = `contrato-${namePart}-assinado`
  const path = `sale-contracts/${saleContractId}/${fileName}_${Date.now()}.pdf`
  const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' })
  return uploadFile(file, path)
}

export async function uploadSaleSignatureDocument(
  token: string,
  slot: 'front' | 'back' | 'selfie',
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `sale-contracts/signatures/${token}/${slot}_${Date.now()}.${ext}`
  return uploadFile(file, path)
}

export async function uploadAffiliateDocument(
  affiliateId: string,
  slot: 'document' | 'selfie',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `affiliates/${affiliateId}/${slot}_${Date.now()}.${ext}`
  return uploadFile(file, path)
}
