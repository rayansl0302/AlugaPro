import { uploadToCloudinary } from './cloudinary'

function folderFromPath(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx >= 0 ? path.slice(0, idx) : ''
}

export async function uploadFile(
  file: File,
  path: string,
  publicId?: string,
): Promise<string> {
  const resourceType = file.type === 'application/pdf' ? 'raw' : 'auto'
  return uploadToCloudinary(file, { folder: folderFromPath(path), resourceType, publicId })
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
  return uploadFile(file, path, `${fileName}-${Date.now()}.pdf`)
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

export async function uploadOwnerPhoto(
  companyId: string,
  ownerId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `companies/${companyId}/owners/${ownerId}/photo_${Date.now()}.${ext}`
  return uploadFile(file, path)
}
