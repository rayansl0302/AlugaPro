import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'

const UPDATED_AT = '25 de junho de 2026'

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Introdução">
        <p>
          Esta Política de Privacidade descreve como o AlugaPro coleta, utiliza, armazena e protege
          dados pessoais de usuários da plataforma, em conformidade com a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018 — LGPD) e demais normas aplicáveis.
        </p>
        <p>
          Ao utilizar o AlugaPro, você concorda com as práticas descritas neste documento.
        </p>
      </LegalSection>

      <LegalSection title="2. Controlador dos Dados">
        <p>
          O controlador dos dados pessoais tratados nesta plataforma é o AlugaPro, responsável pelas
          decisões referentes ao tratamento de dados dos usuários cadastrados.
        </p>
        <p>
          Contato para assuntos de privacidade:{' '}
          <a href="mailto:suporte@alugapro.com.br" className="text-primary underline-offset-2 hover:underline">
            suporte@alugapro.com.br
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Dados Pessoais Coletados">
        <p>Podemos tratar as seguintes categorias de dados, conforme o uso da plataforma:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Identificação:</strong> nome, CPF, CNPJ, foto, documentos de identificação;</li>
          <li><strong>Contato:</strong> e-mail, telefone, WhatsApp, endereço;</li>
          <li><strong>Conta:</strong> credenciais de acesso, perfil, papel (gestor, inquilino, afiliado, admin);</li>
          <li><strong>Contratuais e financeiros:</strong> contratos, valores, cobranças, comprovantes, histórico de pagamentos;</li>
          <li><strong>Patrimoniais:</strong> dados de imóveis, veículos, equipamentos e informações de locação;</li>
          <li><strong>Técnicos:</strong> logs de acesso, endereço IP, identificadores de dispositivo, cookies essenciais;</li>
          <li><strong>Comunicação:</strong> registros de notificações enviadas (e-mail, SMS, push, quando habilitados).</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Dados do Programa de Afiliados">
        <p>
          Para participar do Programa de Afiliados e receber comissões, coletamos dados adicionais
          necessários à validação de identidade e ao pagamento:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>CPF;</li>
          <li>chave PIX para recebimento dos valores;</li>
          <li>foto de documento de identificação com foto (RG, CNH ou similar);</li>
          <li>foto do afiliado segurando o documento de identificação, para confirmação de titularidade.</li>
        </ul>
        <p>
          Esses dados são tratados com a finalidade específica de prevenir fraudes, confirmar a
          identidade do afiliado e viabilizar o pagamento de comissões, com base no consentimento do
          titular e no cumprimento de obrigações legais aplicáveis a operações financeiras. O acesso é
          restrito à equipe responsável pela validação e pagamento de afiliados, e os documentos não são
          utilizados para qualquer outra finalidade.
        </p>
      </LegalSection>

      <LegalSection title="5. Finalidades do Tratamento">
        <p>Os dados são utilizados para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>autenticar usuários e controlar permissões de acesso;</li>
          <li>operar funcionalidades de gestão de locações e portal do inquilino;</li>
          <li>gerar, assinar e armazenar contratos e documentos relacionados;</li>
          <li>processar cobranças, registrar pagamentos e acompanhar inadimplência;</li>
          <li>validar identidade e processar pagamentos de comissões do programa de afiliados;</li>
          <li>enviar comunicações operacionais e alertas configurados;</li>
          <li>melhorar segurança, desempenho e experiência de uso;</li>
          <li>cumprir obrigações legais e responder a solicitações de autoridades.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Bases Legais (LGPD)">
        <p>O tratamento de dados pessoais fundamenta-se, conforme o caso, em:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>execução de contrato ou procedimentos preliminares;</li>
          <li>cumprimento de obrigação legal ou regulatória;</li>
          <li>legítimo interesse, com avaliação de impacto e medidas de minimização;</li>
          <li>consentimento do titular, quando exigido (ex.: verificação de telefone, documentos do programa de afiliados, comunicações opcionais).</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Compartilhamento de Dados">
        <p>
          Os dados podem ser compartilhados com prestadores de serviço essenciais à operação da
          plataforma, tais como hospedagem em nuvem, autenticação, envio de e-mails, armazenamento
          de arquivos e serviços de mensageria, sempre mediante contratos e medidas de segurança
          compatíveis com a LGPD.
        </p>
        <p>
          Não vendemos dados pessoais. O compartilhamento com terceiros também pode ocorrer por
          determinação legal, ordem judicial ou para proteção de direitos do AlugaPro e de seus usuários.
        </p>
      </LegalSection>

      <LegalSection title="8. Armazenamento e Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo controle de
          acesso por perfil, regras de segurança em banco de dados, comunicação criptografada (HTTPS)
          e segregação de dados por empresa (multi-tenant).
        </p>
        <p>
          Apesar dos esforços de segurança, nenhum sistema é totalmente imune a incidentes. Em caso
          de violação relevante de dados, adotaremos procedimentos de resposta e comunicação conforme
          a legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection title="9. Retenção dos Dados">
        <p>
          Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas, obrigações
          legais, exercício regular de direitos e resolução de disputas. Após esse período, poderão
          ser eliminados ou anonimizados, salvo exigência legal em contrário.
        </p>
      </LegalSection>

      <LegalSection title="10. Direitos do Titular">
        <p>Conforme a LGPD, você pode solicitar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>confirmação da existência de tratamento;</li>
          <li>acesso, correção ou atualização de dados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade, quando aplicável;</li>
          <li>informação sobre compartilhamentos;</li>
          <li>revogação de consentimento, quando o tratamento tiver essa base.</li>
        </ul>
        <p>
          Solicitações podem ser enviadas para{' '}
          <a href="mailto:suporte@alugapro.com.br" className="text-primary underline-offset-2 hover:underline">
            suporte@alugapro.com.br
          </a>. Responderemos dentro dos prazos legais.
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies e Tecnologias Similares">
        <p>
          Utilizamos cookies e armazenamento local estritamente necessários para autenticação,
          preferências de interface (como tema) e funcionamento da aplicação. Não utilizamos cookies
          de rastreamento publicitário de terceiros sem consentimento prévio.
        </p>
      </LegalSection>

      <LegalSection title="12. Dados de Menores">
        <p>
          A plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de
          crianças e adolescentes. Caso identifiquemos tal situação, adotaremos medidas para
          exclusão dos dados.
        </p>
      </LegalSection>

      <LegalSection title="13. Transferência Internacional">
        <p>
          Alguns provedores de infraestrutura podem processar dados fora do Brasil. Nesses casos,
          exigimos salvaguardas contratuais e técnicas compatíveis com a LGPD para proteção dos
          titulares.
        </p>
      </LegalSection>

      <LegalSection title="14. Alterações desta Política">
        <p>
          Esta Política pode ser atualizada para refletir mudanças legais, técnicas ou operacionais.
          A data da última revisão será indicada no topo da página. Recomendamos consulta periódica
          a este documento.
        </p>
      </LegalSection>

      <LegalSection title="15. Contato">
        <p>
          Para dúvidas, solicitações ou reclamações relacionadas à privacidade e proteção de dados,
          entre em contato pelo e-mail{' '}
          <a href="mailto:suporte@alugapro.com.br" className="text-primary underline-offset-2 hover:underline">
            suporte@alugapro.com.br
          </a>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
