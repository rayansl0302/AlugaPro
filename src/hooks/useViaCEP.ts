import { useState, useCallback } from 'react'

export interface ViaCEPResult {
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

interface UseCEPReturn {
  loading: boolean
  error: string | null
  fetchCEP: (cep: string) => Promise<ViaCEPResult | null>
}

export function useViaCEP(): UseCEPReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCEP = useCallback(async (cep: string): Promise<ViaCEPResult | null> => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return null

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (!res.ok) throw new Error('Falha na requisição')
      const data: ViaCEPResult = await res.json()
      if (data.erro) {
        setError('CEP não encontrado')
        return null
      }
      return data
    } catch {
      setError('Erro ao consultar CEP')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, fetchCEP }
}
