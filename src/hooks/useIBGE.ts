import { useQuery } from '@tanstack/react-query'

export interface IBGEState {
  id: number
  sigla: string
  nome: string
}

export interface IBGECity {
  id: number
  nome: string
}

async function fetchStates(): Promise<IBGEState[]> {
  const res = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
  )
  if (!res.ok) throw new Error('Falha ao carregar estados')
  return res.json()
}

async function fetchCities(uf: string): Promise<IBGECity[]> {
  if (!uf) return []
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
  )
  if (!res.ok) throw new Error('Falha ao carregar municípios')
  return res.json()
}

export function useStates() {
  return useQuery({
    queryKey: ['ibge-states'],
    queryFn: fetchStates,
    staleTime: Infinity,
  })
}

export function useCities(uf: string) {
  return useQuery({
    queryKey: ['ibge-cities', uf],
    queryFn: () => fetchCities(uf),
    enabled: !!uf,
    staleTime: Infinity,
  })
}
