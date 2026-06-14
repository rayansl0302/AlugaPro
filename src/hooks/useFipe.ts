import { useQuery } from '@tanstack/react-query'

export type FipeVehicleType = 'carros' | 'motos' | 'caminhoes'

export interface FipeBrand {
  nome: string
  valor: string
}

export interface FipeModel {
  modelo: string
}

async function fetchBrands(type: FipeVehicleType): Promise<FipeBrand[]> {
  const res = await fetch(`https://brasilapi.com.br/api/fipe/marcas/v1/${type}`)
  if (!res.ok) throw new Error('Falha ao carregar marcas')
  const data: FipeBrand[] = await res.json()
  return data
    .filter((b) => b.nome)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

async function fetchModels(type: FipeVehicleType, brandCode: string): Promise<FipeModel[]> {
  const res = await fetch(`https://brasilapi.com.br/api/fipe/veiculos/v1/${type}/${brandCode}`)
  if (!res.ok) throw new Error('Falha ao carregar modelos')
  const data: FipeModel[] = await res.json()
  return data
    .filter((m) => m.modelo)
    .sort((a, b) => a.modelo.localeCompare(b.modelo, 'pt-BR'))
}

export function useFipeBrands(type: FipeVehicleType | null) {
  return useQuery({
    queryKey: ['fipe-brands', type],
    queryFn: () => fetchBrands(type as FipeVehicleType),
    enabled: !!type,
    staleTime: 1000 * 60 * 60 * 24,
  })
}

export function useFipeModels(type: FipeVehicleType | null, brandCode: string | null) {
  return useQuery({
    queryKey: ['fipe-models', type, brandCode],
    queryFn: () => fetchModels(type as FipeVehicleType, brandCode as string),
    enabled: !!type && !!brandCode,
    staleTime: 1000 * 60 * 60 * 24,
  })
}
