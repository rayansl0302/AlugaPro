import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'

const UPDATED_AT = '14 de junho de 2026'

export function TermsPage() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Aceitação dos Termos">
        <p>
          Ao acessar ou utilizar a plataforma AlugaPro, você declara ter lido, compreendido e
          concordado com estes Termos de Uso. Caso não concorde com qualquer disposição, não
          utilize o serviço.
        </p>
        <p>
          Estes termos constituem um acordo entre você (usuário) e o AlugaPro, aplicável a gestores,
          administradores, proprietários, inquilinos e demais perfis habilitados na plataforma.
        </p>
      </LegalSection>

      <LegalSection title="2. Definições">
        <p>
          <strong>Plataforma:</strong> sistema AlugaPro, incluindo painel web, portal do inquilino
          e funcionalidades de gestão de locações.
        </p>
        <p>
          <strong>Usuário:</strong> pessoa física ou jurídica cadastrada com login e senha, ou
          autenticada por provedores integrados.
        </p>
        <p>
          <strong>Empresa (company):</strong> organização à qual os dados e operações do usuário
          gestor estão vinculados no sistema.
        </p>
        <p>
          <strong>Conteúdo:</strong> informações, documentos, contratos, imagens e demais dados
          inseridos pelos usuários na plataforma.
        </p>
      </LegalSection>

      <LegalSection title="3. Cadastro e Responsabilidades da Conta">
        <p>
          O usuário é responsável por fornecer informações verdadeiras, manter suas credenciais em
          sigilo e notificar imediatamente qualquer uso não autorizado de sua conta.
        </p>
        <p>
          Cada perfil de acesso possui permissões específicas. O gestor é responsável por conceder
          acessos adequados a colaboradores, inquilinos e demais envolvidos na operação de locação.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso Permitido">
        <p>Você concorda em utilizar o AlugaPro apenas para fins lícitos relacionados à gestão de locações, incluindo:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>cadastro e administração de imóveis, veículos, proprietários e inquilinos;</li>
          <li>geração, assinatura e armazenamento de contratos;</li>
          <li>controle de cobranças, pagamentos e inadimplência;</li>
          <li>comunicação operacional entre as partes envolvidas na locação.</li>
        </ul>
        <p>É vedado utilizar a plataforma para atividades fraudulentas, ilegais, que violem direitos de terceiros ou que comprometam a segurança do sistema.</p>
      </LegalSection>

      <LegalSection title="5. Serviços Oferecidos">
        <p>
          O AlugaPro oferece ferramentas de gestão de locações, incluindo contratos digitais,
          cobranças, relatórios, portal do inquilino, notificações e armazenamento de documentos.
          Funcionalidades podem ser atualizadas, ampliadas ou descontinuadas conforme evolução do produto.
        </p>
        <p>
          Modelos de contrato disponibilizados pelo sistema têm caráter orientativo. A revisão jurídica
          do conteúdo contratual é de responsabilidade do usuário gestor ou de seu advogado.
        </p>
      </LegalSection>

      <LegalSection title="6. Contratos Digitais e Assinaturas">
        <p>
          A plataforma permite coleta de assinaturas de locador, locatário e testemunhas por meio
          eletrônico. O usuário é responsável por garantir a identificação das partes e a validade
          do processo de assinatura conforme a legislação aplicável.
        </p>
        <p>
          O AlugaPro atua como ferramenta tecnológica de apoio e não substitui assessoria jurídica
          especializada na formalização de negócios de locação.
        </p>
      </LegalSection>

      <LegalSection title="7. Pagamentos, Cobranças e Comprovantes">
        <p>
          O registro de cobranças, pagamentos e comprovantes na plataforma não configura, por si só,
          intermediação financeira ou instituição de pagamento, salvo quando expressamente indicado.
        </p>
        <p>
          Valores, vencimentos, multas e encargos devem ser conferidos pelo gestor. A confirmação de
          pagamentos com base em comprovantes enviados por inquilinos é de responsabilidade do usuário
          autorizado na empresa.
        </p>
      </LegalSection>

      <LegalSection title="8. Propriedade Intelectual">
        <p>
          A marca, layout, código, identidade visual e funcionalidades do AlugaPro são protegidos por
          legislação de propriedade intelectual. É proibida a reprodução, engenharia reversa ou
          exploração comercial não autorizada da plataforma.
        </p>
        <p>
          O conteúdo inserido pelo usuário permanece de sua titularidade, concedendo ao AlugaPro
          licença necessária para hospedar, processar e exibir tais dados na operação do serviço.
        </p>
      </LegalSection>

      <LegalSection title="9. Disponibilidade e Limitação de Responsabilidade">
        <p>
          Empregamos esforços razoáveis para manter a plataforma disponível e segura, porém não
          garantimos funcionamento ininterrupto ou livre de erros.
        </p>
        <p>
          O AlugaPro não se responsabiliza por perdas decorrentes de uso inadequado da plataforma,
          informações incorretas inseridas por usuários, indisponibilidade de serviços de terceiros
          (como provedores de nuvem, e-mail ou SMS) ou decisões de negócio tomadas com base em
          relatórios do sistema.
        </p>
      </LegalSection>

      <LegalSection title="10. Suspensão e Encerramento">
        <p>
          Podemos suspender ou encerrar contas em caso de violação destes Termos, suspeita de fraude,
          ordem legal ou risco à segurança da plataforma e de outros usuários.
        </p>
        <p>
          O usuário pode solicitar o encerramento de sua conta conforme canais de suporte
          disponibilizados, observadas obrigações legais de retenção de dados.
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações destes Termos">
        <p>
          Estes Termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas
          por meios razoáveis, como aviso na plataforma ou por e-mail. O uso continuado após a
          vigência das alterações implica aceitação da nova versão.
        </p>
      </LegalSection>

      <LegalSection title="12. Legislação e Foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
          da comarca do domicílio do usuário consumidor, quando aplicável, ou outro foro competente
          conforme legislação vigente.
        </p>
      </LegalSection>

      <LegalSection title="13. Contato">
        <p>
          Dúvidas sobre estes Termos podem ser enviadas para{' '}
          <a href="mailto:suporte@alugapro.com.br" className="text-primary underline-offset-2 hover:underline">
            suporte@alugapro.com.br
          </a>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
