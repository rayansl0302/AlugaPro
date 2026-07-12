import { z } from 'zod'

// Validação padrão de campo de texto obrigatório: remove espaços das pontas e
// exige ao menos 1 caractere, usando a mensagem informada tanto para o caso
// ausente quanto vazio.
export function requiredString(message: string) {
  return z.string({ required_error: message }).trim().min(1, message)
}
