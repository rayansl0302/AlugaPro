const USE_SANDBOX = process.env.ASAAS_USE_SANDBOX === 'true'
const BASE_URL = USE_SANDBOX ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'
const API_KEY = (USE_SANDBOX ? process.env.ASAAS_API_KEY_SANDBOX : process.env.ASAAS_API_KEY)!

export class AsaasError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message)
  }
}

export async function asaasFetch<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      access_token: API_KEY,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(data?.errors) ? data.errors.map((e: { description?: string }) => e.description).join('; ') : res.statusText
    throw new AsaasError(`Asaas ${path} failed: ${msg}`, res.status, data)
  }
  return data as T
}

export interface AsaasCustomer {
  id: string
  name: string
  email?: string
  cpfCnpj: string
}

export async function findCustomerByExternalReference(externalReference: string): Promise<AsaasCustomer | null> {
  const data = await asaasFetch<{ data: AsaasCustomer[] }>(`/customers?externalReference=${encodeURIComponent(externalReference)}`)
  return data.data?.[0] ?? null
}

export async function createCustomer(input: {
  name: string
  email: string
  cpfCnpj: string
  mobilePhone?: string
  externalReference: string
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>('/customers', { method: 'POST', body: input })
}

export interface AsaasSplit {
  walletId: string
  percentualValue: number
}

export interface AsaasSubscription {
  id: string
  customer: string
  status: string
  nextDueDate: string
  value: number
}

export async function createSubscription(input: {
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  nextDueDate: string
  cycle: 'MONTHLY'
  description?: string
  externalReference?: string
  split?: AsaasSplit[]
  callback?: { successUrl: string; autoRedirect?: boolean }
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>('/subscriptions', { method: 'POST', body: input })
}

// Ativa o split numa assinatura já existente — só vale pras cobranças
// futuras geradas a partir de agora, nunca retroage nas já emitidas.
// Usado pelo cron pra aplicar a comissão de afiliado só depois do período
// de carência (não na assinatura inteira desde o primeiro pagamento).
export async function updateSubscriptionSplit(id: string, split: AsaasSplit[]): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, { method: 'PUT', body: { split } })
}

export async function getSubscription(id: string): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`)
}

export interface AsaasPayment {
  id: string
  status: string
  invoiceUrl: string
  subscription?: string
}

export async function getFirstPaymentForSubscription(subscriptionId: string): Promise<AsaasPayment | null> {
  const data = await asaasFetch<{ data: AsaasPayment[] }>(`/payments?subscription=${subscriptionId}&limit=1`)
  return data.data?.[0] ?? null
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${id}`)
}

