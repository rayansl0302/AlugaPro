import { VeiculoSigningData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { ContractBlock } from './imovel'

export function buildVeiculoBlocks(d: VeiculoSigningData, contract: {
  contractNumber: string
  rentValue: number
  cautionValue?: number
  lateFee: number
  monthlyInterest: number
}): ContractBlock[] {
  const loc = d.locador
  const lat = d.locatario
  const vei = d.veiculo
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

  title('CONTRATO DE LOCAÇÃO DE VEÍCULO')
  para(`Nº ${contract.contractNumber}`)
  space()

  subtitle('IDENTIFICAÇÃO DAS PARTES')
  space()

  subtitle('LOCADOR:')
  para(`${loc.name}, ${loc.nationality}, ${loc.maritalStatus}, ${loc.profession}, portador(a) do CPF nº ${loc.cpf} e RG nº ${loc.rg}, residente e domiciliado(a) à ${loc.address}, telefone ${loc.phone}, e-mail ${loc.email}, doravante denominado(a) simplesmente LOCADOR.`)
  space()

  subtitle('LOCATÁRIO:')
  para(`${lat.name}, ${lat.nationality}, ${lat.maritalStatus}, ${lat.profession}, portador(a) do CPF nº ${lat.cpf} e RG nº ${lat.rg}, CNH nº ${lat.cnh}, categoria ${lat.cnhCategoria}, válida até ${lat.cnhValidade}, residente e domiciliado(a) à ${lat.address}, telefone ${lat.phone}, e-mail ${lat.email}, doravante denominado(a) simplesmente LOCATÁRIO.`)
  space()

  if (d.condutoresAdicionais && d.condutoresAdicionais.length > 0) {
    subtitle('CONDUTORES ADICIONAIS AUTORIZADOS:')
    d.condutoresAdicionais.forEach((c, i) => {
      para(`${i + 1}. ${c.name}, CPF nº ${c.cpf}, CNH nº ${c.cnh}.`)
    })
    space()
  }

  if (d.testemunha1) {
    subtitle('TESTEMUNHAS:')
    para(`1ª Testemunha: ${d.testemunha1.name}, CPF nº ${d.testemunha1.cpf}, RG nº ${d.testemunha1.rg}.`)
    if (d.testemunha2) para(`2ª Testemunha: ${d.testemunha2.name}, CPF nº ${d.testemunha2.cpf}, RG nº ${d.testemunha2.rg}.`)
    space()
  }

  para(`As partes acima qualificadas celebram o presente CONTRATO DE LOCAÇÃO DE VEÍCULO, que se regerá pelo Código Civil Brasileiro, pelo Código de Defesa do Consumidor (quando aplicável) e pela legislação de trânsito vigente (Lei nº 9.503/1997 — CTB), com as seguintes cláusulas e condições:`)
  space()

  // CLÁUSULA 1
  clause('CLÁUSULA 1ª', 'DO OBJETO DA LOCAÇÃO')
  sub('1.1', `O LOCADOR dá em locação ao LOCATÁRIO o veículo de sua propriedade com as seguintes características: Marca: ${vei.marca}; Modelo: ${vei.modelo}; Ano: ${vei.ano}; Cor: ${vei.cor}; Placa: ${vei.placa}; RENAVAM: ${vei.renavam}; Chassi: ${vei.chassi}; Quilometragem inicial: ${vei.kmInicial} km; Estado geral: ${vei.estadoGeral}.`)
  sub('1.2', `O LOCATÁRIO declara ter inspecionado o veículo antes da assinatura deste contrato, recebendo-o em perfeito estado de funcionamento, conservação e limpeza, conforme registro fotográfico realizado no ato da entrega, que integra este instrumento como Anexo I.`)
  sub('1.3', `O veículo objeto desta locação destina-se exclusivamente ao uso pessoal ou profissional lícito do LOCATÁRIO e dos condutores adicionais expressamente autorizados neste instrumento, sendo vedada sua utilização para qualquer finalidade ilegal, competição desportiva, locação a terceiros ou transporte remunerado de passageiros.`)
  space()

  // CLÁUSULA 2
  clause('CLÁUSULA 2ª', 'DO PRAZO DA LOCAÇÃO')
  sub('2.1', `O veículo será retirado pelo LOCATÁRIO em ${d.prazo.dataRetiradaFormatada} às ${d.prazo.horarioRetirada}, e deverá ser devolvido em ${d.prazo.dataDevolucaoFormatada} até as ${d.prazo.horarioDevolucao}, no mesmo local de retirada, salvo acordo prévio e escrito em contrário.`)
  sub('2.2', `A devolução com atraso sujeitará o LOCATÁRIO ao pagamento proporcional de diárias adicionais, acrescidas de multa de ${multa} ao dia sobre o valor da diária, além de juros de ${juros}.`)
  sub('2.3', `A prorrogação do prazo somente será admitida mediante solicitação com antecedência mínima de vinte e quatro (24) horas e expressa concordância do LOCADOR.`)
  sub('2.4', `O não retorno do veículo no prazo contratado, sem justificativa aceita pelo LOCADOR, autorizará a comunicação às autoridades policiais por subtração ou apropriação indébita, nos termos do art. 168 e seguintes do Código Penal.`)
  space()

  // CLÁUSULA 3
  clause('CLÁUSULA 3ª', 'DO VALOR DA LOCAÇÃO E FORMA DE PAGAMENTO')
  sub('3.1', `O valor ajustado para a presente locação é de: ${fin.valorDiario ? `R$ ${fin.valorDiario} (diário)` : ''}${fin.valorSemanal ? ` / R$ ${fin.valorSemanal} (semanal)` : ''} / ${valorMensal} (mensal).`)
  if (caucao) sub('3.2', `O LOCATÁRIO depositará, a título de caução, a importância de ${caucao}, que lhe será restituída integralmente ao término da locação, deduzidos eventuais débitos, danos ou multas.`)
  if (fin.pixKey) sub('3.3', `O pagamento deverá ser realizado mediante PIX à chave: ${fin.pixKey}${fin.banco ? `, Banco ${fin.banco}` : ''}.`)
  sub('3.4', `O atraso no pagamento sujeitará o LOCATÁRIO a: (a) multa de ${multa}; (b) juros de mora de ${juros}; (c) correção monetária pelo IPCA.`)
  space()

  // CLÁUSULA 4
  clause('CLÁUSULA 4ª', 'DAS GARANTIAS')
  sub('4.1', `As garantias previstas neste contrato destinam-se a assegurar o cumprimento integral das obrigações do LOCATÁRIO, cobrindo aluguéis, encargos, multas, danos ao veículo, despesas com guincho, pátio, multas de trânsito e honorários advocatícios.`)
  sub('4.2', `O LOCADOR reserva-se o direito de exigir seguro adicional ou garantia complementar sempre que julgar necessário, mediante comunicação ao LOCATÁRIO com antecedência de quarenta e oito (48) horas.`)
  space()

  // CLÁUSULA 5
  clause('CLÁUSULA 5ª', 'DAS OBRIGAÇÕES DO LOCATÁRIO')
  sub('5.1', `O LOCATÁRIO obriga-se a utilizar o veículo com diligência e responsabilidade, observando rigorosamente as normas do Código de Trânsito Brasileiro (Lei nº 9.503/1997) e a legislação estadual e municipal aplicável.`)
  sub('5.2', `O LOCATÁRIO é integralmente responsável pela conservação do veículo durante toda a vigência da locação, respondendo pelos seguintes danos, ainda que causados por terceiros com sua autorização: (a) danos mecânicos por mau uso; (b) danos elétricos por uso inadequado; (c) danos na suspensão e direção; (d) danos em pneus e rodas por uso irregular; (e) danos em vidros e espelhos; (f) danos em lataria e pintura; (g) danos em estofamento e interior.`)
  sub('5.3', `Respondem solidariamente com o LOCATÁRIO pelos danos ao veículo: os condutores adicionais autorizados; familiares; funcionários; e terceiros a quem o LOCATÁRIO tenha cedido o veículo, ainda que momentaneamente.`)
  sub('5.4', `É vedado ao LOCATÁRIO: (a) conduzir o veículo sob influência de álcool ou substâncias psicoativas; (b) participar de disputas ou corridas; (c) circular em estradas não pavimentadas sem autorização prévia do LOCADOR; (d) rebocar outros veículos ou reboques sem autorização; (e) transportar cargas além da capacidade do veículo.`)
  sub('5.5', `O LOCATÁRIO é responsável pelo abastecimento regular de combustível, óleo e demais fluidos, devendo devolver o veículo com o mesmo nível de combustível recebido.`)
  space()

  // CLÁUSULA 6
  clause('CLÁUSULA 6ª', 'DAS MULTAS E INFRAÇÕES DE TRÂNSITO')
  sub('6.1', `Todas as multas de trânsito cometidas durante o período de posse do veículo pelo LOCATÁRIO serão de sua responsabilidade exclusiva, incluindo o valor da multa, as taxas administrativas e os pontos na CNH.`)
  sub('6.2', `O LOCATÁRIO obriga-se a reembolsar o LOCADOR por qualquer multa registrada em nome do veículo no prazo de dez (10) dias após a notificação, acrescida de taxa administrativa de 10% sobre o valor da infração.`)
  sub('6.3', `O LOCATÁRIO obriga-se a identificar-se como condutor infrator sempre que solicitado pelos órgãos de trânsito competentes, eximindo o LOCADOR de responsabilidade pelas infrações cometidas durante a vigência desta locação.`)
  sub('6.4', `O não reembolso de multas nos prazos previstos autorizará o LOCADOR a descontar os valores da caução ou acionar judicialmente o LOCATÁRIO, acrescido de honorários advocatícios.`)
  space()

  // CLÁUSULA 7
  clause('CLÁUSULA 7ª', 'DOS ACIDENTES E SINISTROS')
  sub('7.1', `Em caso de acidente, colisão, incêndio, roubo, furto ou qualquer sinistro envolvendo o veículo, o LOCATÁRIO obriga-se a: (a) comunicar imediatamente o LOCADOR por qualquer meio disponível; (b) acionar as autoridades policiais e registrar Boletim de Ocorrência (B.O.) quando exigível; (c) coletar dados dos envolvidos (nome, CPF, CNH, placa, seguradora e apólice); (d) colaborar plenamente com a seguradora na regularização do sinistro.`)
  sub('7.2', `O LOCATÁRIO responderá integralmente pelos danos ao veículo nos seguintes casos, ainda que exista seguro: (a) condução sob efeito de álcool ou drogas; (b) direção imprudente, negligente ou imperita; (c) uso por pessoa não autorizada neste contrato; (d) descumprimento das obrigações deste contrato.`)
  sub('7.3', `Na hipótese de sinistro com perda total do veículo, o LOCATÁRIO responderá pela diferença entre o valor de mercado (tabela FIPE) e o valor da indenização paga pela seguradora, quando houver.`)
  space()

  // CLÁUSULA 8
  clause('CLÁUSULA 8ª', 'DE GUINCHO, REMOÇÃO E APREENSÃO')
  sub('8.1', `Todos os custos com guincho, remoção, pátio e liberação do veículo decorrentes de atos ou omissões do LOCATÁRIO serão de sua responsabilidade exclusiva, incluindo as despesas de regularização perante os órgãos competentes.`)
  sub('8.2', `Em caso de apreensão do veículo por autoridade de trânsito durante o período da locação, o LOCATÁRIO obriga-se a: (a) comunicar imediatamente o LOCADOR; (b) providenciar a liberação do veículo às suas expensas; (c) ressarcir o LOCADOR por eventuais perdas e danos decorrentes da apreensão.`)
  space()

  // CLÁUSULA 9
  clause('CLÁUSULA 9ª', 'DA MANUTENÇÃO')
  sub('9.1', `As manutenções preventivas e corretivas decorrentes do desgaste natural do veículo são de responsabilidade do LOCADOR. Contudo, os danos decorrentes de negligência, mau uso, manutenção inadequada realizada pelo LOCATÁRIO ou descumprimento das recomendações do fabricante são de responsabilidade exclusiva do LOCATÁRIO.`)
  sub('9.2', `Qualquer manutenção de emergência realizada pelo LOCATÁRIO durante o período da locação deverá ser previamente autorizada pelo LOCADOR, salvo em situação de risco imediato à segurança, sendo as despesas devidamente documentadas para posterior reembolso.`)
  space()

  // CLÁUSULA 10
  clause('CLÁUSULA 10ª', 'DO SEGURO')
  sub('10.1', `O veículo poderá estar coberto por seguro facultativo contratado pelo LOCADOR. Nesta hipótese, o LOCATÁRIO responde pelo valor da franquia decorrente de sinistros ocorridos durante o período da locação.`)
  sub('10.2', `O seguro não cobrirá danos decorrentes de uso doloso, embriaguez, condução por pessoa não autorizada ou infrações graves ao CTB praticadas pelo LOCATÁRIO, hipóteses em que este responderá integralmente pelos danos.`)
  sub('10.3', `Inexistindo cobertura securitária, o LOCATÁRIO responderá pelos danos ao veículo pelo valor apurado em laudo de avaliação independente, acrescido de honorários advocatícios e custas processuais, se for o caso.`)
  space()

  // CLÁUSULA 11
  clause('CLÁUSULA 11ª', 'DA RESCISÃO')
  sub('11.1', `O LOCADOR poderá rescindir este contrato imediatamente, independentemente de notificação prévia, nas seguintes hipóteses: (a) inadimplemento do LOCATÁRIO; (b) utilização irregular do veículo; (c) acidente grave por culpa comprovada do LOCATÁRIO; (d) descumprimento de qualquer cláusula deste contrato; (e) uso do veículo para fins ilícitos.`)
  sub('11.2', `A rescisão por culpa do LOCATÁRIO não elimina sua responsabilidade pelos danos causados ao veículo nem pelas multas e encargos em aberto na data da rescisão.`)
  space()

  // CLÁUSULA 12
  clause('CLÁUSULA 12ª', 'DA INADIMPLÊNCIA')
  sub('12.1', `O não pagamento dos valores contratados nos prazos estipulados sujeitará o LOCATÁRIO a: (a) multa de ${multa}; (b) juros de mora de ${juros}; (c) correção monetária; (d) cobrança extrajudicial e judicial; (e) inclusão nos órgãos de proteção ao crédito (SPC/Serasa) quando legalmente permitida; (f) protesto do título, se houver.`)
  sub('12.2', `Os honorários advocatícios decorrentes de cobrança judicial serão de vinte por cento (20%) sobre o débito total atualizado.`)
  space()

  // CLÁUSULA 13
  clause('CLÁUSULA 13ª', 'DA RESPONSABILIDADE CIVIL')
  sub('13.1', `O LOCATÁRIO responde integralmente por todos os prejuízos causados ao veículo e a terceiros durante a vigência da locação, inclusive por atos praticados por condutores autorizados, familiares ou funcionários seus, nos termos dos arts. 927, 932 e 933 do Código Civil Brasileiro.`)
  sub('13.2', `A responsabilidade civil do LOCATÁRIO é objetiva quanto aos danos causados por veículo em movimento, nos termos do art. 37, § 6º, da Constituição Federal, aplicável analogicamente às relações privadas de guarda de coisa perigosa.`)
  space()

  // CLÁUSULA 14
  clause('CLÁUSULA 14ª', 'DA DEVOLUÇÃO DO VEÍCULO')
  sub('14.1', `O veículo deverá ser devolvido ao LOCADOR nas mesmas condições em que foi recebido, ressalvado o desgaste natural pelo uso ordinário, devendo estar: (a) na data e horário contratados; (b) com todos os acessórios, documentos e chaves entregues; (c) com o mesmo nível de combustível; (d) limpo externamente e internamente.`)
  sub('14.2', `Eventuais avarias, danos ou deteriorações constatadas na vistoria de devolução, comparada à vistoria de entrega, serão de responsabilidade do LOCATÁRIO, que deverá indenizar o LOCADOR no prazo de cinco (05) dias após apuração dos custos.`)
  space()

  // CLÁUSULA 15
  clause('CLÁUSULA 15ª', 'DA ASSINATURA DIGITAL E AUTENTICIDADE')
  sub('15.1', `As partes concordam expressamente que este contrato seja celebrado com assinatura eletrônica, na forma da Medida Provisória nº 2.200-2/2001, art. 10, § 2º, com verificação de identidade por documento oficial com foto.`)
  sub('15.2', `As fotos dos documentos de identificação e as assinaturas eletrônicas manuscritas capturadas neste ato têm validade jurídica plena, constituindo prova hábil da concordância das partes com o teor deste instrumento.`)
  space()

  // CLÁUSULA 16
  clause('CLÁUSULA 16ª', 'DO FORO')
  sub('16.1', `As partes elegem o Foro da Comarca de ${d.foro} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`)
  space()

  para(`E por estarem assim justos e contratados, firmam as partes o presente instrumento na cidade de ${d.cidade}, em ${d.dataContrato}.`)

  return blocks
}
