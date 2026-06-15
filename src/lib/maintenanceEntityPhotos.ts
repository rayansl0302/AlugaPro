import type { MaintenanceRequest, Property, Tenant, Vehicle } from '@/types'

export interface MaintenancePhotoLookups {
  tenantById: Record<string, Tenant>
  propertyById: Record<string, Property>
  vehicleById: Record<string, Vehicle>
}

export interface ResolvedMaintenanceEntityPhotos {
  tenantPhotoUrl?: string
  tenantName: string
  assetPhotoUrl?: string
  assetType?: 'imovel' | 'veiculo'
  assetName?: string
}

export function buildMaintenancePhotoLookups(
  properties: Property[],
  vehicles: Vehicle[],
  tenants: Tenant[],
): MaintenancePhotoLookups {
  return {
    tenantById: Object.fromEntries(tenants.map((tenant) => [tenant.id, tenant])),
    propertyById: Object.fromEntries(properties.map((property) => [property.id, property])),
    vehicleById: Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle])),
  }
}

export function resolveMaintenanceEntityPhotos(
  request: MaintenanceRequest,
  lookups: MaintenancePhotoLookups,
): ResolvedMaintenanceEntityPhotos {
  return resolveChargeEntityPhotos(
    {
      tenantId: request.tenantId,
      tenantName: request.tenantName,
      propertyId: request.propertyId,
      propertyName: request.propertyName,
    },
    lookups,
  )
}

export interface ChargeEntityInput {
  tenantId: string
  tenantName?: string
  propertyId: string
  propertyName?: string
  assetType?: 'imovel' | 'veiculo'
}

export function inferAssetType(
  propertyId: string,
  lookups: MaintenancePhotoLookups,
  contractAssetType?: 'imovel' | 'veiculo',
): 'imovel' | 'veiculo' {
  if (contractAssetType) return contractAssetType
  if (lookups.vehicleById[propertyId]) return 'veiculo'
  return 'imovel'
}

export function resolveChargeEntityPhotos(
  input: ChargeEntityInput,
  lookups: MaintenancePhotoLookups,
): ResolvedMaintenanceEntityPhotos {
  const tenant = lookups.tenantById[input.tenantId]
  const property = lookups.propertyById[input.propertyId]
  const vehicle = lookups.vehicleById[input.propertyId]
  const assetType = input.assetType ?? inferAssetType(input.propertyId, lookups)

  const assetName =
    input.propertyName ??
    property?.name ??
    (vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined)

  return {
    tenantPhotoUrl: tenant?.photoUrl,
    tenantName: input.tenantName ?? tenant?.name ?? 'Inquilino',
    assetPhotoUrl: property?.photos?.[0] ?? vehicle?.photos?.[0],
    assetType,
    assetName,
  }
}
