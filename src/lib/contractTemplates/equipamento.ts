import { EquipamentoSigningData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { ContractBlock } from './imovel'

export function buildEquipamentoBlocks(d: EquipamentoSigningData, contract: {
  contractNumber: string
  rentValue: number
  cautionValue?: number
  lateFee: number
  monthlyInterest: number
}): ContractBlock[] {
  const loc = d.locador
  const lat = d.locatario
  const eq = d.equipamento
  const fin = d.financeiro
  const multa = `${contract.lateFee}%`
  const juros = `${contract.monthlyInterest}% ao mês`
  const valorMensal = fin.valorMensal ?? formatCurrency(contract.rentValue)
  const caucao = fin.caucaoValor ?? (contract.cautionValue ? formatCurrency(contract.cautionValue) : null)

  const blocks: ContractBlock[] = []
  const add = (b: ContractBlock) => blocks.push(b)
  const title = (text: string) => add({ type: 'title', text })
  const subtitle = (text: string) => add({ type: 'subtitle', text })
  const clause = (number: string, text: string) => add({ type: 'clause', number, text })
  const sub = (number: string, text: string) => add({ type: 'subclause', number, text })
  const para = (text: string) => add({ type: 'paragraph', text })
  const space = () => add({ type: 'spacer' })

  title('CONTRATO DE LOCAÇÃO DE EQUIPAMENTO')
  para(`Nº ${contract.contractNumber}`)
  space()

  subtitle('IDENTIFICAÇÃO DAS PARTES')
  space()

  subtitle('LOCADOR:')
  para(`${loc.name}, ${loc.nationality}, ${loc.maritalStatus}, ${loc.profession}, portador(a) do CPF nº ${loc.cpf} e RG nº ${loc.rg}, residente e domiciliado(a) à ${loc.address}, telefone ${loc.phone}, e-mail ${loc.email}, doravante denominado(a) simplesmente LOCADOR.`)
  space()

  subtitle('LOCATÁRIO:')
  para(`${lat.name}, ${lat.nationality}, ${lat.maritalStatus}, ${lat.profession}, portador(a) do CPF nº ${lat.cpf} e RG nº ${lat.rg}, residente e domiciliado(a) à ${lat.address}, telefone ${lat.phone}, e-mail ${lat.email}, doravante denominado(a) simplesmente LOCATÁRIO.`)
  space()

  if (d.testemunha1) {
    subtitle('TESTEMUNHAS:')
    para(`1ª Testemunha: ${d.testemunha1.name}, CPF nº ${d.testemunha1.cpf}, RG nº ${d.testemunha1.rg}.`)
    if (d.testemunha2) para(`2ª Testemunha: ${d.testemunha2.name}, CPF nº ${d.testemunha2.cpf}, RG nº ${d.testemunha2.rg}.`)
    space()
  }

  para(`As partes acima qualificadas celebram o presente CONTRATO DE LOCAÇÃO DE BEM MÓVEL (EQUIPAMENTO), que se regerá pelas disposições dos artigos 565 a 578 do Código Civil Brasileiro (Lei nº 10.406/2002), atinentes à locação de coisas, e pelas cláusulas e condições a seguir estipuladas:`)
  space()

  // CLÁUSULA 1
  clause('CLÁUSULA 1ª', 'DO OBJETO DA LOCAÇÃO')
  sub('1.1', `O LOCADOR dá em locação ao LOCATÁRIO o equipamento de sua propriedade com as seguintes características: Descrição: ${eq.descricao}; Marca: ${eq.marca || 'não informada'}; Modelo: ${eq.modelo}; Nº de série/patrimônio: ${eq.numeroSerie || 'não informado'}; Estado geral na entrega: ${eq.estadoGeral}.`)
  sub('1.2', `Acompanham o equipamento, na entrega, os seguintes acessórios: ${eq.acessorios || 'nenhum acessório adicional'}.`)
  sub('1.3', `O LOCATÁRIO declara ter inspecionado o equipamento antes da assinatura deste contrato, recebendo-o em condições de funcionamento e operação, conforme registro fotográfico realizado no ato da entrega, que integra este instrumento como Anexo I.`)
  sub('1.4', `O equipamento destina-se exclusivamente ao uso lícito do LOCATÁRIO, sendo vedada sua utilização para fins diversos dos quais foi projetado, bem como sua sublocação, cessão ou empréstimo a terceiros sem autorização expressa e escrita do LOCADOR.`)
  space()

  // CLÁUSULA 2
  clause('CLÁUSULA 2ª', 'DO PRAZO DA LOCAÇÃO')
  sub('2.1', `O equipamento será retirado pelo LOCATÁRIO em ${d.prazo.dataRetiradaFormatada}, e deverá ser devolvido em ${d.prazo.dataDevolucaoFormatada}, no mesmo local de retirada, salvo acordo prévio e escrito em contrário.`)
  sub('2.2', `A devolução com atraso sujeitará o LOCATÁRIO ao pagamento proporcional de diárias adicionais, calculadas pelo valor diário da locação, acrescidas de multa de ${multa} sobre o valor em atraso, além de juros de ${juros}.`)
  sub('2.3', `A prorrogação do prazo somente será admitida mediante solicitação com antecedência mínima de vinte e quatro (24) horas e expressa concordância do LOCADOR, sujeita à disponibilidade do equipamento.`)
  space()

  // CLÁUSULA 3
  clause('CLÁUSULA 3ª', 'DO VALOR DA LOCAÇÃO E FORMA DE PAGAMENTO')
  sub('3.1', `O valor ajustado para a presente locação é de: ${fin.valorDiario ? `R$ ${fin.valorDiario} (diário)` : ''}${fin.valorSemanal ? ` / R$ ${fin.valorSemanal} (semanal)` : ''} / ${valorMensal} (mensal).`)
  if (caucao) sub('3.2', `O LOCATÁRIO depositará, a título de caução, a importância de ${caucao}, que lhe será restituída integralmente ao término da locação, deduzidos eventuais débitos, danos, avarias ou multas apurados na devolução.`)
  if (fin.pixKey) sub('3.3', `O pagamento deverá ser realizado mediante PIX à chave: ${fin.pixKey}${fin.banco ? `, Banco ${fin.banco}` : ''}.`)
  sub('3.4', `O atraso no pagamento sujeitará o LOCATÁRIO a: (a) multa de ${multa}; (b) juros de mora de ${juros}; (c) correção monetária pelo IPCA.`)
  space()

  // CLÁUSULA 4
  clause('CLÁUSULA 4ª', 'DAS OBRIGAÇÕES DO LOCATÁRIO')
  sub('4.1', `O LOCATÁRIO obriga-se a utilizar o equipamento com diligência, exclusivamente para a finalidade a que se destina, observando as instruções e recomendações técnicas do fabricante e as normas de segurança do trabalho aplicáveis (NRs do Ministério do Trabalho), quando pertinentes.`)
  sub('4.2', `O LOCATÁRIO é integralmente responsável pela guarda e conservação do equipamento durante toda a vigência da locação, devendo adotar as medidas de proteção necessárias contra furto, roubo, extravio, chuva, umidade e demais intempéries.`)
  sub('4.3', `É de responsabilidade do LOCATÁRIO assegurar que a operação do equipamento seja realizada por pessoa capacitada e, quando exigido por lei ou norma técnica, devidamente certificada para tal função.`)
  sub('4.4', `Respondem solidariamente com o LOCATÁRIO pelos danos ao equipamento: seus funcionários, prestadores de serviço e terceiros a quem tenha permitido o uso, ainda que momentaneamente.`)
  space()

  // CLÁUSULA 5
  clause('CLÁUSULA 5ª', 'DA MANUTENÇÃO')
  sub('5.1', `As manutenções preventivas decorrentes do desgaste natural pelo uso ordinário do equipamento são de responsabilidade do LOCADOR. Os danos decorrentes de mau uso, negligência, imperícia ou descumprimento das recomendações do fabricante são de responsabilidade exclusiva do LOCATÁRIO.`)
  sub('5.2', `Qualquer reparo de emergência realizado pelo LOCATÁRIO durante o período da locação deverá ser previamente autorizado pelo LOCADOR, salvo situação de risco imediato à segurança, sendo as despesas devidamente documentadas para posterior análise de reembolso.`)
  space()

  // CLÁUSULA 6
  clause('CLÁUSULA 6ª', 'DE DANOS, AVARIAS E EXTRAVIO')
  sub('6.1', `O LOCATÁRIO responderá integralmente pelos danos, avarias ou pelo extravio (furto, roubo ou perda) do equipamento ocorridos durante a vigência da locação, ressalvado o desgaste natural pelo uso ordinário.`)
  sub('6.2', `Em caso de dano que comprometa o funcionamento do equipamento, o LOCATÁRIO responderá pelo custo integral do reparo. Em caso de extravio ou dano que torne o reparo inviável, o LOCATÁRIO responderá pelo valor de mercado do equipamento, apurado em avaliação independente.`)
  sub('6.3', `Em caso de furto ou roubo, o LOCATÁRIO obriga-se a comunicar imediatamente o LOCADOR e registrar Boletim de Ocorrência (B.O.) junto à autoridade policial competente, fornecendo cópia ao LOCADOR no prazo de quarenta e oito (48) horas.`)
  space()

  // CLÁUSULA 7
  clause('CLÁUSULA 7ª', 'DA RESPONSABILIDADE CIVIL')
  sub('7.1', `O LOCATÁRIO responde integralmente por todos os danos pessoais ou materiais causados a terceiros decorrentes da operação ou guarda do equipamento durante a vigência da locação, nos termos dos arts. 927 e 931 do Código Civil Brasileiro.`)
  sub('7.2', `O LOCADOR não responde por acidentes de trabalho ou danos a terceiros decorrentes de uso inadequado, falta de treinamento do operador ou descumprimento de normas de segurança pelo LOCATÁRIO.`)
  space()

  // CLÁUSULA 8
  clause('CLÁUSULA 8ª', 'DA DEVOLUÇÃO DO EQUIPAMENTO')
  sub('8.1', `O equipamento deverá ser devolvido ao LOCADOR nas mesmas condições em que foi recebido, ressalvado o desgaste natural pelo uso ordinário, devendo estar: (a) na data contratada; (b) com todos os acessórios e itens entregues na retirada; (c) limpo e em condições de armazenamento adequadas.`)
  sub('8.2', `Eventuais avarias, danos ou ausência de acessórios constatados na vistoria de devolução, comparada à vistoria de entrega, serão de responsabilidade do LOCATÁRIO, que deverá indenizar o LOCADOR no prazo de cinco (05) dias após apuração dos custos.`)
  space()

  // CLÁUSULA 9
  clause('CLÁUSULA 9ª', 'DA RESCISÃO')
  sub('9.1', `O LOCADOR poderá rescindir este contrato imediatamente, independentemente de notificação prévia, nas seguintes hipóteses: (a) inadimplemento do LOCATÁRIO; (b) utilização irregular ou em desacordo com a finalidade do equipamento; (c) descumprimento de qualquer cláusula deste contrato; (d) uso do equipamento para fins ilícitos.`)
  sub('9.2', `A rescisão por culpa do LOCATÁRIO não elimina sua responsabilidade pelos danos causados ao equipamento nem pelos valores em aberto na data da rescisão, obrigando-se à devolução imediata do bem.`)
  space()

  // CLÁUSULA 10
  clause('CLÁUSULA 10ª', 'DA INADIMPLÊNCIA')
  sub('10.1', `O não pagamento dos valores contratados nos prazos estipulados sujeitará o LOCATÁRIO a: (a) multa de ${multa}; (b) juros de mora de ${juros}; (c) correção monetária; (d) cobrança extrajudicial e judicial; (e) inclusão nos órgãos de proteção ao crédito (SPC/Serasa), quando legalmente permitida.`)
  sub('10.2', `Os honorários advocatícios decorrentes de cobrança judicial serão de vinte por cento (20%) sobre o débito total atualizado.`)
  space()

  // CLÁUSULA 11
  clause('CLÁUSULA 11ª', 'DA ASSINATURA DIGITAL E AUTENTICIDADE')
  sub('11.1', `As partes concordam expressamente que este contrato seja celebrado com assinatura eletrônica, na forma da Medida Provisória nº 2.200-2/2001, art. 10, § 2º, com verificação de identidade por documento oficial com foto.`)
  sub('11.2', `As fotos dos documentos de identificação e as assinaturas eletrônicas manuscritas capturadas neste ato têm validade jurídica plena, constituindo prova hábil da concordância das partes com o teor deste instrumento.`)
  space()

  // CLÁUSULA 12
  clause('CLÁUSULA 12ª', 'DO FORO')
  sub('12.1', `As partes elegem o Foro da Comarca de ${d.foro} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`)
  space()

  para(`E por estarem assim justos e contratados, firmam as partes o presente instrumento na cidade de ${d.cidade}, em ${d.dataContrato}.`)

  return blocks
}
