import { useEffect, useState } from 'react'
import { UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Loader2, Search, CheckCircle, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useViaCEP } from '@/hooks/useViaCEP'
import { useStates, useCities } from '@/hooks/useIBGE'
import { fieldErrorClass } from '@/lib/formErrors'

interface AddressFormFields {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  [key: string]: unknown
}

interface AddressFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: (name: string) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>
  prefix?: string
  errors?: Record<string, { message?: string }>
}

export function AddressFields({ register, setValue, watch, prefix = '', errors = {} }: AddressFieldsProps) {
  const p = (field: string) => (prefix ? `${prefix}.${field}` : field)

  const { fetchCEP, loading: cepLoading, error: cepError } = useViaCEP()
  const { data: states = [] } = useStates()

  const selectedState = watch(p('state')) as string
  const { data: cities = [], isFetching: citiesLoading } = useCities(selectedState)

  const [cepStatus, setCepStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const handleCEP = async (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 8) { setCepStatus('idle'); return }

    const result = await fetchCEP(digits)
    if (result) {
      setValue(p('street'), result.logradouro)
      setValue(p('neighborhood'), result.bairro)
      setValue(p('city'), result.localidade)
      setValue(p('state'), result.uf)
      if (result.complemento) setValue(p('complement'), result.complemento)
      setCepStatus('ok')
    } else {
      setCepStatus('error')
    }
  }

  const zipCode = watch(p('zipCode')) as string
  useEffect(() => {
    if (zipCode) handleCEP(zipCode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode])

  const formatCEP = (v: string) =>
    v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* CEP */}
      <div className="space-y-2">
        <Label>CEP *</Label>
        <div className="relative">
          <Input
            placeholder="00000-000"
            maxLength={9}
            className={fieldErrorClass(errors[p('zipCode')])}
            {...register(p('zipCode'))}
            onChange={(e) => {
              const formatted = formatCEP(e.target.value)
              setValue(p('zipCode'), formatted)
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {!cepLoading && cepStatus === 'ok' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {!cepLoading && cepStatus === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
            {!cepLoading && cepStatus === 'idle' && (
              <Search className="h-4 w-4 text-muted-foreground/50" />
            )}
          </span>
        </div>
        {cepError && <p className="text-xs text-destructive">{cepError}</p>}
        {errors[p('zipCode')]?.message && (
          <p className="text-xs text-destructive">{errors[p('zipCode')].message}</p>
        )}
        <p className="text-xs text-muted-foreground">Digite o CEP para preencher automaticamente</p>
      </div>

      {/* UF via IBGE */}
      <div className="space-y-2">
        <Label>Estado *</Label>
        <Select
          value={selectedState || ''}
          onValueChange={(v) => {
            setValue(p('state'), v)
            setValue(p('city'), '')
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.sigla} value={s.sigla}>
                {s.sigla} — {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors[p('state')]?.message && (
          <p className="text-xs text-destructive">{errors[p('state')].message}</p>
        )}
      </div>

      {/* Rua */}
      <div className="space-y-2 sm:col-span-2">
        <Label>Rua / Logradouro *</Label>
        <Input placeholder="Rua das Flores" className={fieldErrorClass(errors[p('street')])} {...register(p('street'))} />
        {errors[p('street')]?.message && (
          <p className="text-xs text-destructive">{errors[p('street')].message}</p>
        )}
      </div>

      {/* Número + Complemento */}
      <div className="space-y-2">
        <Label>Número *</Label>
        <Input placeholder="123" className={fieldErrorClass(errors[p('number')])} {...register(p('number'))} />
        {errors[p('number')]?.message && (
          <p className="text-xs text-destructive">{errors[p('number')].message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Complemento</Label>
        <Input placeholder="Apto 42, Bloco B" {...register(p('complement'))} />
      </div>

      {/* Bairro */}
      <div className="space-y-2">
        <Label>Bairro *</Label>
        <Input placeholder="Centro" className={fieldErrorClass(errors[p('neighborhood')])} {...register(p('neighborhood'))} />
        {errors[p('neighborhood')]?.message && (
          <p className="text-xs text-destructive">{errors[p('neighborhood')].message}</p>
        )}
      </div>

      {/* Cidade via IBGE */}
      <div className="space-y-2">
        <Label>Cidade *</Label>
        {cities.length > 0 ? (
          <Select
            value={watch(p('city')) || ''}
            onValueChange={(v) => setValue(p('city'), v)}
          >
            <SelectTrigger>
              {citiesLoading
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span>
                : <SelectValue placeholder="Selecione a cidade" />
              }
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input placeholder="Cidade" className={fieldErrorClass(errors[p('city')])} {...register(p('city'))} />
        )}
        {errors[p('city')]?.message && (
          <p className="text-xs text-destructive">{errors[p('city')].message}</p>
        )}
      </div>
    </div>
  )
}
