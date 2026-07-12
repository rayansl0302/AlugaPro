// Classe aplicada ao campo quando o valor preenchido é inválido: borda e foco
// em vermelho, sinalizando visualmente o erro para o usuário. Aceita tanto o
// FieldError do react-hook-form quanto o formato genérico usado em componentes
// compartilhados (ex.: AddressFields).
const ERROR_FIELD_CLASS = 'border-destructive focus-visible:ring-destructive'

export function fieldErrorClass(error?: { message?: string } | boolean): string {
  return error ? ERROR_FIELD_CLASS : ''
}
