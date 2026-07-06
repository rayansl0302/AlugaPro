import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'

const UPDATED_AT = '6 de julho de 2026'

export function AccountDeletionPage() {
  return (
    <LegalLayout title="Exclusão de Conta e Dados" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Como solicitar a exclusão">
        <p>
          Para solicitar a exclusão da sua conta AlugaPro e dos dados pessoais associados, envie um
          e-mail para{' '}
          <a href="mailto:suporte@alugapro.com.br" className="text-primary underline-offset-2 hover:underline">
            suporte@alugapro.com.br
          </a>{' '}
          a partir do endereço cadastrado na plataforma, com o assunto <strong>"Exclusão de conta"</strong>,
          informando:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nome completo cadastrado;</li>
          <li>E-mail de login;</li>
          <li>Se você é gestor/proprietário, inquilino ou afiliado.</li>
        </ul>
        <p>
          Confirmaremos a solicitação e o encerramento da conta em até <strong>15 dias úteis</strong>,
          conforme prazos da Lei Geral de Proteção de Dados (LGPD).
        </p>
      </LegalSection>

      <LegalSection title="2. O que é excluído">
        <p>Ao confirmar a exclusão, removemos permanentemente:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados de identificação e contato (nome, CPF, e-mail, telefone, endereço, fotos, documentos);</li>
          <li>Credenciais de acesso e perfil da conta;</li>
          <li>Preferências e configurações pessoais.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. O que pode ser mantido, e por quanto tempo">
        <p>
          Alguns dados vinculados a contratos, cobranças e comprovantes de pagamento podem ser mantidos
          mesmo após a exclusão da conta, quando exigido por obrigações legais, fiscais ou contábeis
          (ex.: guarda de documentos financeiros), por até <strong>5 (cinco) anos</strong>, ou pelo prazo
          necessário para exercício regular de direitos e resolução de disputas. Esses dados são mantidos
          apenas para essas finalidades específicas e não são utilizados para nenhum outro fim.
        </p>
        <p>
          Se a conta pertencer a um gestor com contratos ativos ou inquilinos vinculados, a exclusão da
          conta do gestor não apaga automaticamente os dados dos inquilinos vinculados a contratos em
          vigor — nesse caso, entraremos em contato para orientar sobre o encerramento adequado dos
          vínculos antes da exclusão.
        </p>
      </LegalSection>

      <LegalSection title="4. Dúvidas">
        <p>
          Para mais detalhes sobre como tratamos dados pessoais, consulte nossa{' '}
          <a href="/politica-de-privacidade" className="text-primary underline-offset-2 hover:underline">
            Política de Privacidade
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
