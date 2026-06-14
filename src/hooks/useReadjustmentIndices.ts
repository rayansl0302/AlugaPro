import { useQuery } from '@tanstack/react-query'

export interface IndexValue {
  name: string
  code: string
  value: number | null
  referenceDate: string
  source: string
}

// BCB série codes:
// 433 = IPCA (% a.m.)
// 189 = IGP-M (% a.m.)
// 188 = INPC (% a.m.)
// 432 = SELIC acumulada no mês
const SERIES: Array<{ name: string; code: string }> = [
  { name: 'IPCA', code: '433' },
  { name: 'IGP-M', code: '189' },
  { name: 'INPC', code: '188' },
  { name: 'SELIC', code: '432' },
]

async function fetchSeriesLastValue(code: string): Promise<{ value: number; date: string } | null> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (!data?.length) return null
  return { value: parseFloat(data[0].valor.replace(',', '.')), date: data[0].data }
}

async function fetchAllIndices(): Promise<IndexValue[]> {
  const results = await Promise.allSettled(
    SERIES.map(async (s) => {
      const last = await fetchSeriesLastValue(s.code)
      return {
        name: s.name,
        code: s.code,
        value: last?.value ?? null,
        referenceDate: last?.date ?? '',
        source: 'Banco Central do Brasil',
      } satisfies IndexValue
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<IndexValue> => r.status === 'fulfilled')
    .map((r) => r.value)
}

export function useReadjustmentIndices() {
  return useQuery({
    queryKey: ['readjustment-indices'],
    queryFn: fetchAllIndices,
    staleTime: 1000 * 60 * 60 * 4, // 4h — dados atualizados mensalmente
    retry: 1,
  })
}
