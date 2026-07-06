import { motion } from 'framer-motion'
import { Building2, Car, FileText, TrendingUp, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { easeTransition } from '@/lib/motion'

const CHART_HEIGHTS = ['h-6', 'h-9', 'h-7', 'h-11', 'h-9', 'h-12', 'h-10'] as const

const LIST_ITEMS = [
  { name: 'Apto. Centro — Maria S.', value: 1850, status: 'pago' as const },
  { name: 'Casa Jardins — João P.', value: 2400, status: 'pendente' as const },
  { name: 'Honda Civic — Ana R.', value: 980, status: 'pago' as const },
]

export function LandingHeroPreview() {
  return (
    <motion.div
      className="relative w-full min-w-0 max-w-[480px] lg:ml-auto"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />

      <motion.div
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-12px_rgba(3,43,97,0.12)]"
        initial={{ opacity: 0, scale: 0.94, rotateY: -6 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ ...easeTransition, delay: 0.35 }}
        style={{ transformPerspective: 1200 }}
      >
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
            {[
              { icon: Building2, value: '24', label: 'Imóveis', cls: 'bg-slate-50', iconCls: 'text-[#032B61]', valCls: 'text-slate-900' },
              { icon: Car, value: '8', label: 'Veículos', cls: 'bg-slate-50', iconCls: 'text-[#032B61]', valCls: 'text-slate-900' },
              { icon: TrendingUp, value: '+12%', label: 'Receita', cls: 'bg-emerald-50', iconCls: 'text-emerald-600', valCls: 'text-emerald-700 text-sm' },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  className={`rounded-xl p-3 ${stat.cls}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...easeTransition, delay: 0.5 + i * 0.1 }}
                >
                  <Icon className={`h-4 w-4 ${stat.iconCls}`} />
                  <p className={`mt-2 font-bold ${stat.valCls}`}>{stat.value}</p>
                  <p className="text-[10px] text-slate-500">{stat.label}</p>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            className="rounded-xl border border-slate-100 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Receitas do mês</p>
              <span className="text-xs font-bold text-[#032B61]">{formatCurrency(42850)}</span>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {CHART_HEIGHTS.map((h, i) => (
                <motion.div
                  key={i}
                  className={`flex-1 rounded-t-sm bg-gradient-to-t from-[#032B61] to-sky-500 ${h}`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ ...easeTransition, delay: 0.85 + i * 0.06 }}
                  style={{ originY: 1 }}
                />
              ))}
            </div>
          </motion.div>

          <div className="space-y-2">
            {LIST_ITEMS.map((item, i) => (
              <motion.div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...easeTransition, delay: 1.1 + i * 0.1 }}
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
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
