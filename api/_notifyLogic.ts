/**
 * Lógica pura de notificações de cobrança.
 * Compartilhada entre whatsapp-notify.ts e cron-daily-notifications.ts.
 */

export type NotificationTrigger =
  | 'vencimento_7dias'
  | 'vencimento_3dias'
  | 'vencimento_1dia'
  | 'vencido_dia'
  | 'vencido_3dias'
  | 'vencido_7dias'
  | 'vencido_15dias'

export interface ChargeSnapshot {
  dueDate?: string
  status: string
  amount: number
  totalAmount?: number
  tenantName?: string
  propertyName?: string
  description: string
  notificationsSent?: string[]
  lastNotifiedDate?: string   // YYYY-MM-DD — evita reenvio de atraso no mesmo dia
}

/** Calcula diferença em dias inteiros entre duas strings YYYY-MM-DD */
export function diffDays(from: string, to: string): number {
  const msPerDay = 86_400_000
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay)
}

/**
 * Qual trigger deve disparar hoje para esta cobrança?
 * Lógica acumulativa para overdue (garante entrega mesmo se o cron falhou ontem).
 * Retorna null se nenhum trigger precisa ser disparado.
 */
export function getTriggerForToday(
  charge: ChargeSnapshot,
  today: string,
): NotificationTrigger | null {
  const due = charge.dueDate
  if (!due) return null
  if (charge.status === 'pago' || charge.status === 'cancelado') return null

  const sent = new Set(charge.notificationsSent ?? [])
  const daysUntilDue = diffDays(today, due) // positivo = futuro, negativo = passado

  // ─── Pré-vencimento (reminders antes de vencer) ───────────────────────────
  if (daysUntilDue === 7 && !sent.has('vencimento_7dias')) return 'vencimento_7dias'
  if (daysUntilDue === 3 && !sent.has('vencimento_3dias')) return 'vencimento_3dias'
  if (daysUntilDue === 1 && !sent.has('vencimento_1dia'))  return 'vencimento_1dia'

  // ─── Pós-vencimento (envia 1× por dia enquanto em atraso) ───────────────────
  if (daysUntilDue <= 0) {
    if (charge.lastNotifiedDate === today) return null   // já enviou hoje

    const daysLate = Math.abs(daysUntilDue)
    if (daysLate >= 15) return 'vencido_15dias'
    if (daysLate >= 7)  return 'vencido_7dias'
    if (daysLate >= 3)  return 'vencido_3dias'
    return 'vencido_dia'
  }

  return null
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt  = (v: number) => BRL.format(v)

/** Monta o texto da mensagem WhatsApp para cada trigger */
export function buildMessage(charge: ChargeSnapshot, trigger: NotificationTrigger): string {
  const name     = charge.tenantName  ?? 'Inquilino'
  const property = charge.propertyName ?? 'seu imóvel'
  const desc     = charge.description
  const value    = fmt(charge.totalAmount ?? charge.amount)
  const due      = charge.dueDate
    ? new Date(charge.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—'

  switch (trigger) {
    case 'vencimento_7dias':
      return (
        `Olá ${name}! 👋\n\n` +
        `Lembramos que sua cobrança vence em *7 dias*:\n` +
        `📋 ${desc}\n🏠 ${property}\n📅 Vencimento: *${due}*\n💰 Valor: *${value}*\n\n` +
        `Pague em dia e evite multas. AlugaPro.`
      )
    case 'vencimento_3dias':
      return (
        `Olá ${name}! ⏰\n\n` +
        `Sua cobrança vence em *3 dias*:\n` +
        `📋 ${desc}\n🏠 ${property}\n📅 Vencimento: *${due}*\n💰 Valor: *${value}*\n\n` +
        `Evite encargos — pague em dia. AlugaPro.`
      )
    case 'vencimento_1dia':
      return (
        `⚠️ Olá ${name}, sua cobrança vence *AMANHÃ*!\n\n` +
        `📋 ${desc}\n🏠 ${property}\n📅 *${due}*\n💰 *${value}*\n\n` +
        `Realize o pagamento para evitar multa e juros. AlugaPro.`
      )
    case 'vencido_dia':
      return (
        `❗ Olá ${name}, sua cobrança venceu *hoje*.\n\n` +
        `📋 ${desc}\n🏠 ${property}\n💰 *${value}*\n\n` +
        `Por favor, regularize o quanto antes para evitar encargos. AlugaPro.`
      )
    case 'vencido_3dias':
      return (
        `❗ Olá ${name}, sua cobrança está *3 dias em atraso*.\n\n` +
        `📋 ${desc}\n🏠 ${property}\n💰 *${value}* (+ encargos)\n\n` +
        `Entre em contato para regularizar. AlugaPro.`
      )
    case 'vencido_7dias':
      return (
        `⚠️❗ Olá ${name}, sua cobrança está *7 dias em atraso*!\n\n` +
        `📋 ${desc}\n🏠 ${property}\n💰 *${value}* (+ multa + juros)\n\n` +
        `É urgente regularizar sua situação. Entre em contato imediatamente. AlugaPro.`
      )
    case 'vencido_15dias':
      return (
        `⛔ Olá ${name}, sua cobrança está *15 dias em atraso*.\n\n` +
        `📋 ${desc}\n🏠 ${property}\n💰 *${value}* (+ encargos acumulados)\n\n` +
        `Contato urgente necessário para evitar medidas administrativas. AlugaPro.`
      )
  }
}

/** Assunto do e-mail para cada trigger. */
export function buildEmailSubject(charge: ChargeSnapshot, trigger: NotificationTrigger): string {
  const property = charge.propertyName ?? 'seu imóvel'
  switch (trigger) {
    case 'vencimento_7dias': return `[AlugaPro] Cobrança vence em 7 dias — ${property}`
    case 'vencimento_3dias': return `[AlugaPro] Cobrança vence em 3 dias — ${property}`
    case 'vencimento_1dia':  return `[AlugaPro] Cobrança vence amanhã — ${property}`
    case 'vencido_dia':      return `[AlugaPro] Cobrança vencida hoje — ${property}`
    case 'vencido_3dias':    return `[AlugaPro] Cobrança em atraso (3 dias) — ${property}`
    case 'vencido_7dias':    return `[AlugaPro] Cobrança em atraso (7 dias) — ${property}`
    case 'vencido_15dias':   return `[AlugaPro] Cobrança em atraso (15 dias) — ${property}`
  }
}
