import { Building2, Car, FileText, TrendingUp, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const CHART_HEIGHTS = ['h-6', 'h-9', 'h-7', 'h-11', 'h-9', 'h-12', 'h-10'] as const

export function LandingHeroPreview() {
  return (
    <div className="relative w-full max-w-[480px] lg:ml-auto">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/25 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-500">Painel — AlugaPro</span>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <Building2 className="h-4 w-4 text-[#032B61]" />
              <p className="mt-2 text-lg font-bold text-slate-900">24</p>
              <p className="text-[10px] text-slate-500">Imóveis</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <Car className="h-4 w-4 text-[#032B61]" />
              <p className="mt-2 text-lg font-bold text-slate-900">8</p>
              <p className="text-[10px] text-slate-500">Veículos</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-sm font-bold text-emerald-700">+12%</p>
              <p className="text-[10px] text-emerald-600/80">Receita</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Receitas do mês</p>
              <span className="text-xs font-bold text-[#032B61]">{formatCurrency(42850)}</span>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {CHART_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm bg-gradient-to-t from-[#032B61] to-sky-500 ${h}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {[
              { name: 'Apto. Centro — Maria S.', value: 1850, status: 'pago' as const },
              { name: 'Casa Jardins — João P.', value: 2400, status: 'pendente' as const },
              { name: 'Honda Civic — Ana R.', value: 980, status: 'pago' as const },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate text-xs font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {formatCurrency(item.value)}
                  </span>
                  {item.status === 'pago' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
