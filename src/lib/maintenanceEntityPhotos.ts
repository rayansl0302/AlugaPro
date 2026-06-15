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
  const tenant = lookups.tenantById[request.tenantId]
  const property = lookups.propertyById[request.propertyId]
  const vehicle = lookups.vehicleById[request.propertyId]

  const assetName =
    request.propertyName ??
    property?.name ??
    (vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined)

  return {
    tenantPhotoUrl: tenant?.photoUrl,
    tenantName: request.tenantName ?? tenant?.name ?? 'Inquilino',
    assetPhotoUrl: property?.photos?.[0] ?? vehicle?.photos?.[0],
    assetType: property ? 'imovel' : vehicle ? 'veiculo' : undefined,
    assetName,
  }
}
