// Sistema de templates de e-mail marketing do AlugaPro.
//
// A ideia: um layout base "bonitinho e padronizado" (tabelas + estilos inline,
// como exige e-mail), e presets que só preenchem o conteúdo. O HTML gerado
// carrega os tokens {{name}} e {{unsubscribeUrl}} — o backend (api/send-campaign)
// substitui por destinatário na hora do envio. Assim toda a lógica de layout
// fica num lugar só (frontend), e o backend só personaliza e dispara.

export const BRAND = {
  navy: '#032B61',
  green: '#16a34a',
  slate50: '#f8fafc',
  slate200: '#e2e8f0',
  slate500: '#64748b',
  slate700: '#334155',
  // URL absoluta (e-mail não aceita caminho relativo). Produção: alugapro.tech
  logoUrl: 'https://www.alugapro.tech/logo-completa-horizontal-alugapro.png',
  siteUrl: 'https://alugapro.tech',
  supportEmail: 'suporte@alugapro.com.br',
  companyLine: 'AlugaPro — Gestão Inteligente de Aluguéis',
}

export interface EmailContent {
  /** Texto de pré-visualização (aparece ao lado do assunto na caixa de entrada). */
  preheader: string
  /** Título grande no topo do corpo. */
  headline: string
  /** Parágrafos do corpo (HTML simples permitido em cada um). */
  paragraphs: string[]
  /** Botão de call-to-action (opcional). */
  ctaLabel?: string
  ctaUrl?: string
  /** Rodapé pequeno de contexto (opcional), ex.: por que está recebendo. */
  footerNote?: string
}

function button(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td align="center" bgcolor="${BRAND.navy}" style="border-radius:10px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;
                    font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

/** Monta o HTML completo, branded e responsivo, de um e-mail de marketing. */
export function renderMarketingEmail(content: EmailContent): string {
  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.slate700};">${p}</p>`,
    )
    .join('')

  const cta = content.ctaLabel && content.ctaUrl ? button(content.ctaLabel, content.ctaUrl) : ''
  const footerNote = content.footerNote
    ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.slate500};">${content.footerNote}</p>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${content.headline}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.slate50};">
  <!-- preheader escondido -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${content.preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.slate50};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid ${BRAND.slate200};border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:28px 24px 12px;border-bottom:1px solid ${BRAND.slate200};">
              <a href="${BRAND.siteUrl}" target="_blank" style="text-decoration:none;">
                <img src="${BRAND.logoUrl}" alt="AlugaPro" width="200"
                     style="display:block;width:200px;max-width:70%;height:auto;border:0;">
              </a>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:bold;color:${BRAND.navy};">
                ${content.headline}
              </h1>
              ${paragraphs}
              ${cta}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid ${BRAND.slate200};background-color:#fbfcfe;">
              ${footerNote}
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.slate500};">
                ${BRAND.companyLine} · <a href="${BRAND.siteUrl}" target="_blank" style="color:${BRAND.slate500};">alugapro.tech</a>
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.slate500};">
                Você recebeu este e-mail como contato do AlugaPro.
                <a href="{{unsubscribeUrl}}" target="_blank" style="color:${BRAND.slate500};text-decoration:underline;">Descadastrar</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Presets padronizados ─────────────────────────────────────────────────────
// Cada template é uma função que recebe campos editáveis e devolve o assunto
// sugerido + o conteúdo. A saudação usa {{name}} (o backend personaliza).

export type EmailTemplateId = 'boasVindas' | 'novidade' | 'promocao' | 'reengajamento' | 'generico'

export interface EmailTemplateMeta {
  id: EmailTemplateId
  name: string
  description: string
}

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  { id: 'boasVindas', name: 'Boas-vindas', description: 'Recepção de novo cliente/lead' },
  { id: 'novidade', name: 'Novidade / Recurso', description: 'Anúncio de novidade do produto' },
  { id: 'promocao', name: 'Promoção / Oferta', description: 'Oferta ou campanha promocional' },
  { id: 'reengajamento', name: 'Reengajamento', description: 'Reativar contato inativo' },
  { id: 'generico', name: 'Genérico (livre)', description: 'Título + texto livre + botão' },
]

export interface TemplateFields {
  headline?: string
  paragraphs?: string[]
  ctaLabel?: string
  ctaUrl?: string
  preheader?: string
  footerNote?: string
}

const SIGNUP_URL = 'https://alugapro.tech/login?mode=signup'

/** Conteúdo default de cada preset — o admin pode editar tudo antes de enviar. */
export function templateDefaults(id: EmailTemplateId): Required<Omit<EmailContent, never>> {
  switch (id) {
    case 'boasVindas':
      return {
        preheader: 'Sua locação organizada, do contrato ao recebimento.',
        headline: 'Bem-vindo(a) ao AlugaPro, {{name}}!',
        paragraphs: [
          'Que bom ter você por aqui. O AlugaPro reúne imóveis, veículos e equipamentos, contratos digitais, cobranças e portal do inquilino num só lugar.',
          'Configure sua empresa em menos de 5 minutos e comece a organizar sua operação hoje.',
        ],
        ctaLabel: 'Começar agora',
        ctaUrl: SIGNUP_URL,
        footerNote: '',
      }
    case 'novidade':
      return {
        preheader: 'Novidade no AlugaPro que vai facilitar seu dia a dia.',
        headline: 'Novidade no AlugaPro 🎉',
        paragraphs: [
          'Olá, {{name}}! Lançamos um recurso novo pra deixar sua gestão ainda mais simples.',
          '<strong>[Descreva a novidade aqui]</strong> — conte em 1 ou 2 frases o benefício principal.',
        ],
        ctaLabel: 'Ver no sistema',
        ctaUrl: 'https://alugapro.tech/dashboard',
        footerNote: '',
      }
    case 'promocao':
      return {
        preheader: '14 dias grátis, sem cartão. Aproveite.',
        headline: 'Uma condição especial pra você, {{name}}',
        paragraphs: [
          'Teste o AlugaPro por 14 dias, com acesso completo ao plano Pro — sem cartão, sem compromisso.',
          'Menos planilha, menos inadimplência, mais controle da sua operação de locação.',
        ],
        ctaLabel: 'Ativar meu teste grátis',
        ctaUrl: SIGNUP_URL,
        footerNote: '',
      }
    case 'reengajamento':
      return {
        preheader: 'Faz tempo que a gente não se fala — tudo bem por aí?',
        headline: 'Sentimos sua falta, {{name}}',
        paragraphs: [
          'Percebemos que faz um tempo que você não usa o AlugaPro. Que tal voltar e deixar suas locações em dia?',
          'Se precisar de ajuda pra retomar, é só responder este e-mail — a gente te ajuda.',
        ],
        ctaLabel: 'Voltar ao AlugaPro',
        ctaUrl: 'https://alugapro.tech/dashboard',
        footerNote: '',
      }
    case 'generico':
    default:
      return {
        preheader: '',
        headline: 'Título do e-mail',
        paragraphs: ['Escreva aqui o conteúdo da sua mensagem, {{name}}.'],
        ctaLabel: '',
        ctaUrl: '',
        footerNote: '',
      }
  }
}
