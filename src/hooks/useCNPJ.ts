import { useState, useCallback } from 'react'

export interface CNPJResult {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  email?: string
  ddd_telefone_1?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  situacao_cadastral?: string
}

interface UseCNPJReturn {
  loading: boolean
  error: string | null
  fetchCNPJ: (cnpj: string) => Promise<CNPJResult | null>
}

export function useCNPJ(): UseCNPJReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCNPJ = useCallback(async (cnpj: string): Promise<CNPJResult | null> => {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return null

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.message ?? 'CNPJ não encontrado')
        return null
      }
      return await res.json()
    } catch {
      setError('Erro ao consultar CNPJ')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, fetchCNPJ }
}
