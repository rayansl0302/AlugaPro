import { useQuery } from '@tanstack/react-query'

export interface Bank {
  ispb: string
  name: string
  code: number | null
  fullName: string
}

async function fetchBanks(): Promise<Bank[]> {
  const res = await fetch('https://brasilapi.com.br/api/banks/v1')
  if (!res.ok) throw new Error('Falha ao carregar bancos')
  const data: Bank[] = await res.json()
  return data
    .filter((b) => b.code !== null && b.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: fetchBanks,
    staleTime: 1000 * 60 * 60 * 24, // 24h — lista raramente muda
  })
}
