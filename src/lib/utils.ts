import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatDatetime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm")
}

export function formatDateOptional(
  date: string | Date | undefined | null,
  fallback = '—',
  pattern = 'dd/MM/yyyy'
): string {
  if (!date) return fallback
  const d = typeof date === 'string' ? parseISO(date) : date
  if (Number.isNaN(d.getTime())) return fallback
  return format(d, pattern, { locale: ptBR })
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function formatCEP(cep: string): string {
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2')
}

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function calculateLateFee(amount: number, lateFeePercent: number): number {
  return amount * (lateFeePercent / 100)
}

export function calculateInterest(amount: number, monthlyRate: number, daysLate: number): number {
  const dailyRate = monthlyRate / 30 / 100
  return amount * dailyRate * daysLate
}

export function getDaysLate(dueDate: string): number {
  const due = parseISO(dueDate)
  const today = new Date()
  if (isAfter(today, due)) {
    return differenceInDays(today, due)
  }
  return 0
}

export function isOverdue(dueDate: string): boolean {
  return isBefore(parseISO(dueDate), new Date())
}

export function getDaysUntilDue(dueDate: string): number {
  const due = parseISO(dueDate)
  const today = new Date()
  if (isBefore(today, due)) {
    return differenceInDays(due, today)
  }
  return 0
}

export function generateContractNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 9000) + 1000
  return `CTR-${year}-${random}`
}

export function generateSaleContractNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 9000) + 1000
  return `TER-${year}-${random}`
}

export function generatePropertyCode(): string {
  const random = Math.floor(Math.random() * 90000) + 10000
  return `IMV-${random}`
}

export function generateVehicleCode(): string {
  const random = Math.floor(Math.random() * 90000) + 10000
  return `VEI-${random}`
}

export function generateEquipmentCode(): string {
  const random = Math.floor(Math.random() * 90000) + 10000
  return `EQP-${random}`
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function removeMask(value: string): string {
  return value.replace(/\D/g, '')
}
