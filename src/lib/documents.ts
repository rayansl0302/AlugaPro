export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// Valida CPF pelos dígitos verificadores e rejeita sequências repetidas
// (ex.: 111.111.111-11), que passariam numa checagem só de tamanho.
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcCheckDigit = (base: string, startFactor: number): number => {
    let total = 0
    let factor = startFactor
    for (const digit of base) {
      total += Number(digit) * factor
      factor -= 1
    }
    const remainder = (total * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  const firstDigit = calcCheckDigit(cpf.slice(0, 9), 10)
  if (firstDigit !== Number(cpf[9])) return false

  const secondDigit = calcCheckDigit(cpf.slice(0, 10), 11)
  return secondDigit === Number(cpf[10])
}

// Valida CNPJ pelos dígitos verificadores.
export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calcCheckDigit = (base: string): number => {
    const weights =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let total = 0
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * weights[i]
    }
    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstDigit = calcCheckDigit(cnpj.slice(0, 12))
  if (firstDigit !== Number(cnpj[12])) return false

  const secondDigit = calcCheckDigit(cnpj.slice(0, 13))
  return secondDigit === Number(cnpj[13])
}

// Telefone BR: fixo (10 dígitos) ou celular (11 dígitos, com 9 após o DDD).
// DDD válido começa em 11.
export function isValidPhoneBR(value: string): boolean {
  const phone = onlyDigits(value)
  if (phone.length !== 10 && phone.length !== 11) return false

  const ddd = Number(phone.slice(0, 2))
  if (ddd < 11) return false

  if (phone.length === 11 && phone[2] !== '9') return false

  return true
}

// CEP: 8 dígitos.
export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8
}

// RG não tem dígito verificador padronizado nacional (o formato varia por
// estado), então validamos por tamanho: 8 a 10 caracteres, onde o dígito
// verificador "X" só é aceito na última posição.
export function isValidRG(value: string): boolean {
  const rg = value.replace(/[^\dXx]/g, '').toUpperCase()
  if (rg.length < 8 || rg.length > 10) return false
  if (/X/.test(rg.slice(0, -1))) return false
  return true
}
