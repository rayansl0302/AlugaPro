import { useState } from 'react'
import { Loader2, Search, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCNPJ, CNPJResult } from '@/hooks/useCNPJ'
import { cn } from '@/lib/utils'

interface CNPJInputProps {
  value: string
  onChange: (value: string) => void
  onFound?: (data: CNPJResult) => void
  placeholder?: string
  className?: string
}

export function CNPJInput({ value, onChange, onFound, placeholder = '00.000.000/0000-00', className }: CNPJInputProps) {
  const { fetchCNPJ, loading, error } = useCNPJ()
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const format = (v: string) =>
    v.replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(format(e.target.value))
    setStatus('idle')
  }

  const handleSearch = async () => {
    const result = await fetchCNPJ(value)
    if (result) {
      setStatus('ok')
      onFound?.(result)
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="space-y-1">
      <div className={cn('relative flex gap-2', className)}>
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={18}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {!loading && status === 'ok' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {!loading && status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={loading || value.replace(/\D/g, '').length !== 14}
          title="Consultar CNPJ"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {status === 'ok' && <p className="text-xs text-green-600">CNPJ encontrado — dados preenchidos automaticamente</p>}
    </div>
  )
}
