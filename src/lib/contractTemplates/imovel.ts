import { ImovelSigningData } from '@/types'
import { formatCurrency } from '@/lib/utils'

export interface ContractBlock {
  type: 'title' | 'subtitle' | 'clause' | 'subclause' | 'paragraph' | 'spacer'
  text?: string
  number?: string
}

export function buildImovelBlocks(d: ImovelSigningData, contract: {
  contractNumber: string
  rentValue: number
  dueDay: number
  cautionValue?: number
  lateFee: number
  monthlyInterest: number
  startDate: string
  endDate?: string
}): ContractBlock[] {
  const loc = d.locador
  const lat = d.locatario
  const imovel = d.imovel
  const fin = d.financeiro
  const prazo = d.prazo
  const multa = `${contract.lateFee}%`
  const juros = `${contract.monthlyInterest}% ao mês`
  const valor = formatCurrency(contract.rentValue)
  const caucao = contract.cautionValue ? formatCurrency(contract.cautionValue) : null

  const blocks: ContractBlock[] = []

  const add = (b: ContractBlock) => blocks.push(b)
  const title = (text: string) => add({ type: 'title', text })
  const subtitle = (text: string) => add({ type: 'subtitle', text })
  const clause = (number: string, text: string) => add({ type: 'clause', number, text })
  const sub = (number: string, text: string) => add({ type: 'subclause', number, text })
  const para = (text: string) => add({ type: 'paragraph', text })
  const space = () => add({ type: 'spacer' })

  title('CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL')
  para(`Nº ${contract.contractNumber}`)
  space()

  // PREÂMBULO
  subtitle('IDENTIFICAÇÃO DAS PARTES')
  space()

  subtitle('LOCADOR:')
  para(`${loc.name}, ${loc.nationality}, ${loc.maritalStatus}, ${loc.profession}, portador(a) do CPF nº ${loc.cpf} e RG nº ${loc.rg}, residente e domiciliado(a) à ${loc.address}, telefone ${loc.phone}, e-mail ${loc.email}, doravante denominado(a) simplesmente LOCADOR.`)
  space()

  subtitle('LOCATÁRIO:')
  para(`${lat.name}, ${lat.nationality}, ${lat.maritalStatus}, ${lat.profession}, portador(a) do CPF nº ${lat.cpf} e RG nº ${lat.rg}, residente e domiciliado(a) à ${lat.address}, telefone ${lat.phone}, e-mail ${lat.email}, doravante denominado(a) simplesmente LOCATÁRIO.`)
  space()

  if (d.fiador) {
    subtitle('FIADOR:')
    para(`${d.fiador.name}, ${d.fiador.nationality}, ${d.fiador.maritalStatus}, ${d.fiador.profession}, portador(a) do CPF nº ${d.fiador.cpf} e RG nº ${d.fiador.rg}, residente e domiciliado(a) à ${d.fiador.address}, com patrimônio descrito como: ${d.fiador.patrimonioDescricao}, doravante denominado(a) simplesmente FIADOR.`)
    space()
  }

  if (d.testemunha1) {
    subtitle('TESTEMUNHAS:')
    para(`1ª Testemunha: ${d.testemunha1.name}, CPF nº ${d.testemunha1.cpf}, RG nº ${d.testemunha1.rg}.`)
    if (d.testemunha2) para(`2ª Testemunha: ${d.testemunha2.name}, CPF nº ${d.testemunha2.cpf}, RG nº ${d.testemunha2.rg}.`)
    space()
  }

  para(`As partes acima identificadas celebram o presente CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL, que se regerá pelas normas da Lei nº 8.245/1991 (Lei do Inquilinato), pelo Código Civil Brasileiro e pelas cláusulas e condições a seguir estipuladas:`)
  space()

  // CLÁUSULA 1
  clause('CLÁUSULA 1ª', 'DO OBJETO DA LOCAÇÃO')
  sub('1.1', `O LOCADOR dá em locação ao LOCATÁRIO o imóvel ${imovel.tipo} situado à ${imovel.endereco}, com área construída de ${imovel.areaConstruida} m² e área total de ${imovel.areaTotal} m², composto por ${imovel.comodos}, com ${imovel.vagas} vaga(s) de garagem, registrado sob a matrícula nº ${imovel.matricula} no ${imovel.cartorio}.`)
  sub('1.2', `O imóvel objeto desta locação conta com os seguintes móveis e equipamentos: ${imovel.mobilia || 'Nenhum — imóvel entregue sem mobiliário'}.`)
  sub('1.3', `O LOCATÁRIO declara expressamente ter visitado e vistoriado o imóvel antes da assinatura deste contrato, recebendo-o em perfeito estado de uso, conservação e habitabilidade, conforme laudo de vistoria inicial que integra este instrumento como Anexo I.`)
  sub('1.4', `O imóvel objeto deste contrato destina-se exclusivamente a uso residencial, sendo vedada qualquer utilização comercial, industrial ou diversa da prevista nesta cláusula.`)
  space()

  // CLÁUSULA 2
  clause('CLÁUSULA 2ª', 'DO PRAZO DA LOCAÇÃO')
  sub('2.1', `A locação terá início em ${prazo.inicioFormatado} e término em ${prazo.terminoFormatado || 'prazo indeterminado'}, totalizando ${prazo.prazoExtenso}.`)
  sub('2.2', `Findo o prazo ajustado, se o LOCATÁRIO continuar na posse do imóvel, por mais de trinta (30) dias, sem oposição do LOCADOR, presumir-se-á prorrogada a locação nas mesmas condições, por prazo indeterminado.`)
  sub('2.3', `Na locação por prazo indeterminado, o LOCADOR poderá notificar o LOCATÁRIO mediante aviso prévio de trinta (30) dias para desocupação do imóvel, nos termos do art. 47 da Lei nº 8.245/1991.`)
  sub('2.4', `O LOCATÁRIO que pretender deixar o imóvel ao término do contrato ou antes do prazo ajustado deverá comunicar o LOCADOR com antecedência mínima de trinta (30) dias, mediante notificação escrita, sob pena de multa equivalente ao valor de um (01) mês de aluguel.`)
  space()

  // CLÁUSULA 3
  clause('CLÁUSULA 3ª', 'DO ALUGUEL E DA FORMA DE PAGAMENTO')
  sub('3.1', `O aluguel mensal é de ${valor} (${d.financeiro.valorExtenso}), a ser pago até o dia ${contract.dueDay} de cada mês subsequente ao vencido.`)
  if (fin.pixKey) sub('3.2', `O pagamento deverá ser realizado mediante PIX à chave: ${fin.pixKey}${fin.banco ? `, Banco ${fin.banco}${fin.agencia ? `, Ag. ${fin.agencia}` : ''}${fin.conta ? `, CC ${fin.conta}` : ''}` : ''}.`)
  sub('3.3', `Ocorrendo atraso no pagamento, o débito ficará sujeito a: (a) multa moratória de ${multa} sobre o valor do aluguel; (b) juros de mora de ${juros}; (c) correção monetária pelo IPCA/IBGE, calculada pro rata die.`)
  sub('3.4', `Os honorários advocatícios decorrentes de cobrança judicial ou extrajudicial, fixados em vinte por cento (20%) sobre o valor do débito, serão igualmente suportados pelo LOCATÁRIO inadimplente.`)
  sub('3.5', `O aluguel será reajustado anualmente pelo índice ${d.indiceReajuste}, conforme autorização legal, sendo que o primeiro reajuste ocorrerá após doze (12) meses da vigência deste contrato.`)
  sub('3.6', `Em nenhuma hipótese o LOCATÁRIO poderá compensar débitos de aluguel com eventuais créditos que entenda possuir em face do LOCADOR, sendo indispensável a prévia autorização judicial para tanto.`)
  space()

  // CLÁUSULA 4
  clause('CLÁUSULA 4ª', 'DA GARANTIA LOCATÍCIA')
  if (caucao) {
    sub('4.1', `Como garantia do cumprimento das obrigações assumidas neste contrato, o LOCATÁRIO deposita ao LOCADOR, a título de caução, a importância de ${caucao}, que lhe será devolvida ao término da locação, sem incidência de juros ou correção monetária, deduzidos eventuais débitos apurados na vistoria final e encargos em atraso, nos termos do art. 38 da Lei nº 8.245/1991.`)
  } else {
    sub('4.1', `A garantia locatícia será prestada na modalidade prevista em instrumento apartado, nos termos dos artigos 37 a 42 da Lei nº 8.245/1991.`)
  }
  sub('4.2', `É vedada, sob pena de nulidade de pleno direito, a exigência de mais de uma modalidade de garantia num mesmo contrato de locação, conforme art. 37, parágrafo único, da Lei nº 8.245/1991.`)
  sub('4.3', `A garantia prestada responde, acessoriamente, por todas as obrigações decorrentes do presente contrato, incluindo aluguéis, encargos, danos ao imóvel, multas, juros, honorários advocatícios e custas judiciais.`)
  space()

  // CLÁUSULA 5
  clause('CLÁUSULA 5ª', 'DAS RESPONSABILIDADES DO LOCATÁRIO')
  sub('5.1', `O LOCATÁRIO obriga-se a conservar o imóvel em perfeito estado de uso e higiene, utilizando-o de forma adequada e cuidadosa, respondendo integralmente pelos danos causados por si, por membros de sua família, por visitantes, por empregados domésticos e por prestadores de serviços que contratar.`)
  sub('5.2', `O LOCATÁRIO obriga-se a reparar imediatamente, às suas expensas, todos os danos, avarias e deteriorações que venham a ocorrer no imóvel durante a vigência desta locação, nomeadamente: pisos, revestimentos, azulejos, paredes, portas, fechaduras, portões, janelas, vidros, pintura interna e externa, instalações elétricas, instalações hidráulicas, equipamentos e móveis fornecidos pelo LOCADOR.`)
  sub('5.3', `O LOCATÁRIO é responsável pelos danos decorrentes de mau uso, negligência, imprudência ou omissão, incluindo, mas não se limitando a: infiltrações por entupimento de ralo ou calha, danos por umidade por uso inadequado, quebra de torneiras, registros, chuveiros e louças sanitárias.`)
  sub('5.4', `O imóvel deverá ser devolvido ao término da locação nas mesmas condições em que foi recebido pelo LOCATÁRIO, ressalvado o desgaste natural comprovado pelo uso ordinário, devidamente atestado no laudo comparativo de vistorias.`)
  sub('5.5', `O LOCATÁRIO não poderá modificar a destinação residencial do imóvel, nem permitir o ingresso de animais de grande porte sem anuência prévia e escrita do LOCADOR.`)
  sub('5.6', `O LOCATÁRIO obriga-se a comunicar imediatamente ao LOCADOR qualquer avaria, infiltração, defeito estrutural ou elétrico que venha a constatar no imóvel, sob pena de responsabilidade pelos agravamentos decorrentes da omissão.`)
  space()

  // CLÁUSULA 6
  clause('CLÁUSULA 6ª', 'DAS DESPESAS E ENCARGOS')
  sub('6.1', `Correm por conta exclusiva do LOCATÁRIO, durante toda a vigência da locação: (a) consumo de água e esgoto; (b) consumo de energia elétrica; (c) consumo de gás; (d) serviços de internet e telecomunicações; (e) taxas ordinárias de condomínio, quando aplicáveis.`)
  sub('6.2', `O Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU) ficará a cargo do LOCATÁRIO, conforme previsão expressa no art. 22, VIII, da Lei nº 8.245/1991, na forma do Art. 25 do mesmo diploma, podendo as partes convencionar de forma diversa por aditivo escrito.`)
  sub('6.3', `A inadimplência dos encargos mencionados nesta cláusula equivale ao inadimplemento do aluguel para todos os fins de direito, incluindo ação de despejo por falta de pagamento, nos termos do art. 9º, III, da Lei nº 8.245/1991.`)
  space()

  // CLÁUSULA 7
  clause('CLÁUSULA 7ª', 'DAS BENFEITORIAS')
  sub('7.1', `O LOCATÁRIO somente poderá realizar reformas, modificações, obras ou benfeitorias no imóvel mediante autorização prévia e escrita do LOCADOR, sob pena de ser obrigado, ao final da locação, a demolir ou restaurar o imóvel ao estado original, às suas expensas, além de responder por eventuais prejuízos causados.`)
  sub('7.2', `As benfeitorias realizadas sem autorização do LOCADOR não serão indenizadas, e o LOCATÁRIO renuncia expressamente ao direito de retenção por benfeitorias, nos termos do art. 35 da Lei nº 8.245/1991.`)
  sub('7.3', `As benfeitorias necessárias realizadas pelo LOCATÁRIO, ainda que sem autorização, serão indenizadas pelo LOCADOR; as úteis somente serão indenizadas se realizadas com autorização. As voluptuárias não geram direito à indenização nem à retenção, podendo o LOCATÁRIO levantá-las ao término da locação se não danificarem o imóvel.`)
  sub('7.4', `Eventuais benfeitorias autorizadas integrarão o imóvel, sendo de livre propriedade do LOCADOR ao término da locação, salvo acordo escrito em contrário.`)
  space()

  // CLÁUSULA 8
  clause('CLÁUSULA 8ª', 'DA SUBLOCAÇÃO E DA CESSÃO')
  sub('8.1', `É expressamente vedada a sublocação total ou parcial do imóvel, o empréstimo a terceiros, a cessão ou transferência dos direitos desta locação, sem prévia e expressa autorização escrita do LOCADOR, nos termos do art. 13 da Lei nº 8.245/1991.`)
  sub('8.2', `O descumprimento do disposto nesta cláusula constituirá infração contratual grave, sujeitando o LOCATÁRIO às penalidades previstas na Cláusula 14ª deste instrumento, além de autorizar o LOCADOR a pleitear o desfazimento da locação por infração legal ou contratual.`)
  space()

  // CLÁUSULA 9
  clause('CLÁUSULA 9ª', 'DA VISTORIA')
  sub('9.1', `Fica estipulada a obrigatoriedade de vistoria inicial e final do imóvel, devendo ambas ser realizadas em conjunto pelas partes ou seus representantes, com registro fotográfico detalhado de todos os cômodos, equipamentos, pisos, paredes, teto e instalações.`)
  sub('9.2', `O laudo de vistoria inicial, assinado por ambas as partes, integra este contrato como Anexo I e constitui documento probatório do estado de conservação do imóvel na data de início da locação.`)
  sub('9.3', `O laudo de vistoria final será comparado ao laudo de vistoria inicial. Eventuais avarias, danos ou deteriorações além do desgaste natural serão de responsabilidade do LOCATÁRIO, que deverá proceder ao reparo ou indenizar o LOCADOR dentro do prazo de quinze (15) dias após a desocupação, sob pena de cobrança judicial.`)
  sub('9.4', `A recusa do LOCATÁRIO em participar da vistoria ou em assinar o respectivo laudo poderá ser suprida por notificação extrajudicial e vistoria realizada por dois (02) profissionais habilitados indicados pelo LOCADOR, cujas conclusões serão plenamente válidas.`)
  space()

  // CLÁUSULA 10
  clause('CLÁUSULA 10ª', 'DO SEGURO')
  sub('10.1', `O LOCADOR, a seu critério, poderá exigir do LOCATÁRIO a contratação de seguro residencial durante a vigência da locação, cobrindo danos ao imóvel e responsabilidade civil perante terceiros, em valor mínimo equivalente a vinte e quatro (24) meses de aluguel.`)
  sub('10.2', `Na existência de seguro contratado pelo LOCADOR, o LOCATÁRIO não se exime de sua responsabilidade por danos dolosos ou por negligência que não estejam cobertos pela apólice ou que impliquem franquia ou perda de benefícios securitários.`)
  space()

  // CLÁUSULA 11
  clause('CLÁUSULA 11ª', 'DO USO, DA CONDUTA E DO SOSSEGO')
  sub('11.1', `É expressamente vedado ao LOCATÁRIO, no imóvel locado e em suas dependências, o uso, consumo, guarda, produção, comercialização ou tráfico de quaisquer drogas ilícitas ou substâncias entorpecentes proibidas por lei, constituindo tal conduta infração contratual grave e ilícito penal, sujeitando o infrator às penalidades deste contrato, à imediata rescisão da locação e às sanções legais cabíveis.`)
  sub('11.2', `O LOCATÁRIO obriga-se a zelar pelo sossego, segurança e bem-estar da vizinhança, sendo vedada a produção de ruídos, sons, músicas, festas ou qualquer perturbação que comprometa o silêncio e a tranquilidade alheia, devendo cessar a emissão de som e a realização de atividades ruidosas a partir das 22h00 (vinte e duas horas), observada a legislação municipal de sossego público e a convenção condominial, quando houver.`)
  sub('11.3', `O LOCATÁRIO responde integralmente por suas condutas e pelas de seus familiares, visitantes, hóspedes e prestadores de serviços, comprometendo-se a observar as normas legais, as posturas municipais e as regras condominiais aplicáveis ao imóvel.`)
  sub('11.4', `A prática das condutas vedadas nesta cláusula ou a reiteração de perturbação do sossego, devidamente comprovada, constituirá infração contratual grave e autorizará o LOCADOR a rescindir a locação, sem prejuízo das demais sanções civis e penais cabíveis.`)
  space()

  // CLÁUSULA 12
  clause('CLÁUSULA 12ª', 'DAS ADVERTÊNCIAS E DA RESCISÃO POR REITERAÇÃO DE INFRAÇÕES')
  sub('12.1', `Sempre que o LOCATÁRIO descumprir qualquer cláusula deste contrato ou dispositivo legal aplicável à locação, o LOCADOR poderá formalizar advertência escrita ao LOCATÁRIO, com indicação da cláusula contratual infringida, da infração praticada e da data de ocorrência, instruída com provas do fato, tais como fotografias e, quando houver, gravações de áudio.`)
  sub('12.2', `As advertências serão registradas e numeradas sequencialmente em sistema próprio de gestão da locação, permanecendo disponíveis para consulta tanto do LOCADOR quanto do LOCATÁRIO, e constituem prova do histórico de infrações cometidas durante a vigência do contrato.`)
  sub('12.3', `Ao ser atingido o número de quatro (04) advertências registradas, fica caracterizada a reiteração de infrações contratuais, autorizando o LOCADOR, a seu exclusivo critério, a promover a rescisão imediata deste contrato, independentemente de notificação judicial ou extrajudicial adicional, sem que assista ao LOCATÁRIO direito a devolução ou compensação dos valores já pagos a título de aluguel, encargos ou qualquer outra verba decorrente deste contrato.`)
  sub('12.4', `O LOCATÁRIO poderá apresentar contestação por escrito a qualquer advertência recebida, no prazo de cinco (05) dias corridos contados de seu recebimento, sem que isso suspenda a contagem das advertências já registradas até manifestação do LOCADOR ou, havendo litígio, decisão do Poder Judiciário.`)
  sub('12.5', `As advertências e as respectivas provas anexadas integram a documentação do contrato e poderão ser apresentadas em juízo como prova do descumprimento contratual reiterado pelo LOCATÁRIO, para instruir ação de despejo, cobrança ou indenização, nos termos dos arts. 369 e 405 do Código de Processo Civil.`)
  space()

  // CLÁUSULA 13
  clause('CLÁUSULA 13ª', 'DA RESCISÃO')
  sub('13.1', `A rescisão antecipada do contrato pelo LOCATÁRIO, antes do término do prazo ajustado, implicará o pagamento de multa proporcional ao período faltante para o término do contrato, calculada conforme a fórmula legal, nos termos da Súmula nº 178 do STJ e do art. 413 do Código Civil.`)
  sub('13.2', `Nos termos do art. 4º, parágrafo único, da Lei nº 8.245/1991, se a rescisão for motivada por transferência do LOCATÁRIO por seu empregador para cidade diversa daquela do imóvel locado, a multa não será devida, desde que a comunicação seja feita com prazo mínimo de trinta (30) dias.`)
  sub('13.3', `O LOCADOR poderá rescindir o contrato imediatamente nas seguintes hipóteses: (a) falta de pagamento do aluguel e encargos; (b) infração legal ou contratual; (c) realização de reparação urgente determinada pelo Poder Público que não possa aguardar o término da locação; (d) utilização do imóvel para fins não residenciais; (e) acúmulo de quatro (04) ou mais advertências registradas nos termos da Cláusula 12ª, hipótese em que a rescisão prescinde da devolução dos valores já pagos, conforme ali disposto.`)
  sub('13.4', `A rescisão por culpa do LOCATÁRIO gera direito ao LOCADOR de reter a garantia prestada, sem prejuízo de ação indenizatória pelos danos sofridos.`)
  space()

  // CLÁUSULA 14
  clause('CLÁUSULA 14ª', 'DA INADIMPLÊNCIA')
  sub('14.1', `O não pagamento do aluguel e demais encargos nos prazos estipulados acarretará: (a) multa moratória de ${multa}; (b) juros de mora de ${juros}; (c) correção monetária pelo IPCA; (d) inclusão do nome do LOCATÁRIO em órgãos de proteção ao crédito, quando legalmente permitida; (e) ajuizamento de ação de despejo por falta de pagamento; (f) execução da garantia locatícia.`)
  sub('14.2', `A cobrança extrajudicial e judicial das dívidas decorrentes deste contrato implicará ao devedor o pagamento de todos os custos incorridos pelo LOCADOR, incluindo honorários advocatícios de vinte por cento (20%) sobre o valor do débito total.`)
  sub('14.3', `O atraso no pagamento por mais de uma vez, ainda que pago com a multa e juros cabíveis, poderá ser considerado, a critério do LOCADOR, como infração contratual reiterada, autorizando a rescisão do contrato por infração às cláusulas.`)
  space()

  // CLÁUSULA 15
  clause('CLÁUSULA 15ª', 'DA RESPONSABILIDADE CIVIL')
  sub('15.1', `O LOCATÁRIO responde integralmente por todos os prejuízos e danos causados ao imóvel durante a vigência da locação, sejam materiais, morais ou de qualquer outra natureza, exceto aqueles decorrentes de caso fortuito, força maior ou desgaste natural comprovado.`)
  sub('15.2', `Respondem solidariamente com o LOCATÁRIO pelos danos: o fiador, se houver; e os condôminos do imóvel, quanto aos danos praticados em partes comuns do condomínio.`)
  sub('15.3', `A responsabilidade do LOCATÁRIO persiste mesmo após a entrega das chaves, caso os danos sejam constatados na vistoria final ou nos dias subsequentes à desocupação, até o limite de trinta (30) dias.`)
  space()

  // CLÁUSULA 16
  clause('CLÁUSULA 16ª', 'DA ASSINATURA DIGITAL E AUTENTICIDADE')
  sub('16.1', `As partes concordam expressamente que o presente contrato seja celebrado com assinatura eletrônica, na forma da Medida Provisória nº 2.200-2/2001, art. 10, § 2º, dispensando o uso de certificados digitais ICP-Brasil, dada a expressa concordância das partes com essa modalidade.`)
  sub('16.2', `A identidade das partes é verificada pelos documentos de identificação pessoal com foto, fotografados e anexados ao presente instrumento, constituindo prova de autoria das assinaturas apostas neste contrato.`)
  sub('16.3', `As assinaturas manuscritas digitalizadas, capturadas em dispositivo eletrônico no momento da celebração deste contrato, possuem validade jurídica plena nos termos da legislação vigente, sendo consideradas meio de prova hábil perante qualquer juízo ou tribunal.`)
  sub('16.4', `O contrato assinado eletronicamente, juntamente com os registros de identidade e metadados (data, hora e dispositivo de assinatura), será armazenado em nuvem segura e poderá ser apresentado como prova em juízo, nos termos dos arts. 439 e 440 do Código de Processo Civil.`)
  space()

  // CLÁUSULA 17
  clause('CLÁUSULA 17ª', 'DO FORO')
  sub('17.1', `As partes elegem o Foro da Comarca de ${d.foro} para dirimir quaisquer dúvidas ou litígios oriundos deste contrato, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja, nos termos do art. 63 do Código de Processo Civil.`)
  sub('17.2', `Antes de recorrer ao Poder Judiciário, as partes comprometem-se a buscar solução extrajudicial através de mediação ou conciliação, sem que isso implique renúncia ao direito de ação judicial.`)
  space()

  // Assinatura
  para(`E, por estarem assim justas e contratadas, firmam as partes o presente instrumento em duas (02) vias de igual teor e forma, na presença das testemunhas abaixo, na cidade de ${d.cidade}, em ${d.dataContrato}.`)

  return blocks
}
