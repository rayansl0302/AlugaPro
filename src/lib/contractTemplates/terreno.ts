import { TerrenoSigningData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { ContractBlock } from './imovel'

export function buildTerrenoBlocks(d: TerrenoSigningData): ContractBlock[] {
  const v = d.vendedor
  const c = d.comprador
  const valor = formatCurrency(d.precoValor)

  const blocks: ContractBlock[] = []

  const add = (b: ContractBlock) => blocks.push(b)
  const title = (text: string) => add({ type: 'title', text })
  const subtitle = (text: string) => add({ type: 'subtitle', text })
  const clause = (number: string, text: string) => add({ type: 'clause', number, text })
  const sub = (number: string, text: string) => add({ type: 'subclause', number, text })
  const para = (text: string) => add({ type: 'paragraph', text })
  const space = () => add({ type: 'spacer' })

  title('CONTRATO DE COMPRA E VENDA DE TERRENO')
  para(`Nº ${d.contractNumber}`)
  space()

  // PREÂMBULO
  subtitle('PARTES CONTRATANTES')
  space()

  subtitle('VENDEDOR:')
  para(`${v.name}, ${v.nationality}, ${v.maritalStatus}, portador(a) do CPF nº ${v.cpf} e RG nº ${v.rg}, residente e domiciliado(a) na ${v.address}, doravante denominado(a) simplesmente VENDEDOR.`)
  space()

  subtitle('COMPRADORA:')
  para(`${c.name}, ${c.nationality}, ${c.maritalStatus}, portadora do CPF nº ${c.cpf} e RG nº ${c.rg}, residente e domiciliada na ${c.address}, doravante denominada simplesmente COMPRADORA.`)
  space()

  if (d.testemunha1) {
    subtitle('TESTEMUNHAS:')
    para(`1ª Testemunha: ${d.testemunha1.name}, CPF nº ${d.testemunha1.cpf}, RG nº ${d.testemunha1.rg}.`)
    if (d.testemunha2) para(`2ª Testemunha: ${d.testemunha2.name}, CPF nº ${d.testemunha2.cpf}, RG nº ${d.testemunha2.rg}.`)
    space()
  }

  para('As partes acima identificadas celebram o presente CONTRATO DE COMPRA E VENDA DE TERRENO, que se regerá pelo Código Civil Brasileiro e pelas cláusulas e condições a seguir estipuladas:')
  space()

  // CLÁUSULA 1 — OBJETO
  clause('CLÁUSULA 1ª', 'DO OBJETO')
  sub('1.1', `O presente contrato tem por objeto a cessão de direitos possessórios do terreno ${d.terrenoCoordenadas ? `localizado nas coordenadas ${d.terrenoCoordenadas}, ` : ''}situado na ${d.terrenoEndereco}.`)
  sub('1.2', `Situação: ${d.terrenoDescricao}`)
  space()

  // CLÁUSULA 2 — PREÇO E FORMA DE PAGAMENTO
  clause('CLÁUSULA 2ª', 'DO PREÇO E DA FORMA DE PAGAMENTO')
  sub('2.1', `O valor total da venda é de ${valor} (${d.precoExtenso}).`)
  sub('2.2', `Forma de pagamento: ${d.formaPagamento}.`)
  sub('2.3', 'O VENDEDOR declara ter recebido o valor total da venda e nada mais ter a receber da COMPRADORA, dando-lhe plena, geral e irrevogável quitação.')
  space()

  // CLÁUSULA 3 — HISTÓRICO DA TRANSAÇÃO
  clause('CLÁUSULA 3ª', 'DO HISTÓRICO DA TRANSAÇÃO')
  sub('3.1', 'As partes declaram que o pagamento foi realizado anteriormente, conforme descrito na Cláusula 2ª.')
  sub('3.2', 'Por acordo verbal entre as partes, a COMPRADORA foi autorizada pelo VENDEDOR a construir no terreno antes da formalização final deste contrato.')
  sub('3.3', 'A construção atualmente existente no local foi erguida pela COMPRADORA com anuência e autorização expressa do VENDEDOR.')
  sub('3.4', 'O presente contrato visa formalizar e regularizar a situação de fato já existente entre as partes.')
  space()

  // CLÁUSULA 4 — DECLARAÇÕES DO VENDEDOR
  clause('CLÁUSULA 4ª', 'DAS DECLARAÇÕES DO VENDEDOR')
  sub('4.1', 'O VENDEDOR declara que: (a) possui direitos possessórios sobre o terreno objeto deste contrato; (b) o terreno não possui documentação registral formal; (c) não tem conhecimento de débitos pendentes sobre o terreno; (d) não existem litígios ou disputas conhecidas sobre a área; (e) cede voluntariamente seus direitos possessórios à COMPRADORA.')
  space()

  // CLÁUSULA 5 — CESSÃO DE DIREITOS POSSESSÓRIOS
  clause('CLÁUSULA 5ª', 'DA CESSÃO DE DIREITOS POSSESSÓRIOS')
  sub('5.1', 'O VENDEDOR cede definitivamente à COMPRADORA todos os seus direitos possessórios sobre o terreno descrito na Cláusula 1ª.')
  sub('5.2', 'A posse plena e definitiva do terreno é transferida à COMPRADORA na data de assinatura deste contrato.')
  sub('5.3', 'A COMPRADORA fica autorizada, desde já, a exercer plena posse, uso e fruição do terreno e da construção nele existente, podendo deles dispor livremente.')
  space()

  // CLÁUSULA 6 — RESPONSABILIDADES E OBRIGAÇÕES
  clause('CLÁUSULA 6ª', 'DAS RESPONSABILIDADES E OBRIGAÇÕES')
  sub('6.1', 'A partir da assinatura deste contrato, a COMPRADORA assume integral responsabilidade pelo terreno, incluindo: pagamento de IPTU e demais tributos incidentes; taxas e contribuições municipais; manutenção e conservação; cumprimento de normas urbanísticas e ambientais.')
  sub('6.2', 'O VENDEDOR exonera-se completamente de qualquer responsabilidade sobre o imóvel após a assinatura deste contrato.')
  space()

  // CLÁUSULA 7 — GARANTIAS PARA A COMPRADORA
  clause('CLÁUSULA 7ª', 'DAS GARANTIAS PARA A COMPRADORA')
  sub('7.1', 'Não interferência: o VENDEDOR compromete-se a nunca interferir, questionar ou reivindicar qualquer direito sobre o terreno ou a construção nele existente.')
  sub('7.2', 'Colaboração para usucapião: o VENDEDOR compromete-se a colaborar e fornecer os documentos necessários para eventual processo de usucapião pela COMPRADORA.')
  sub('7.3', 'Proteção contra terceiros: caso terceiros questionem os direitos da COMPRADORA, o VENDEDOR prestará total colaboração para defendê-los.')
  sub('7.4', 'Renúncia total: o VENDEDOR renuncia definitiva e irrevogavelmente a qualquer direito presente ou futuro sobre o terreno e a construção nele existente.')
  space()

  // CLÁUSULA 8 — REGISTRO E ESCRITURA
  clause('CLÁUSULA 8ª', 'DO REGISTRO E DA ESCRITURA')
  sub('8.1', 'Este contrato produz todos os efeitos legais entre as partes e seus sucessores.')
  sub('8.2', 'Este instrumento servirá como prova da cessão de direitos possessórios para fins de usucapião.')
  sub('8.3', 'A COMPRADORA poderá utilizar este documento em eventual processo judicial de usucapião.')
  space()

  // CLÁUSULA 9 — IRREVERSIBILIDADE
  clause('CLÁUSULA 9ª', 'DA IRREVERSIBILIDADE')
  sub('9.1', 'O presente contrato é irrevogável e irretratável, não podendo ser desfeito por nenhuma das partes, constituindo título hábil para a cessão de direitos possessórios aqui tratada.')
  space()

  // CLÁUSULA 10 — DISPOSIÇÕES GERAIS
  clause('CLÁUSULA 10ª', 'DAS DISPOSIÇÕES GERAIS')
  sub('10.1', 'Este contrato obriga as partes e seus sucessores a qualquer título.')
  sub('10.2', 'Qualquer alteração a este contrato deve ser feita por escrito e assinada por ambas as partes.')
  sub('10.3', 'O VENDEDOR declara estar ciente de que a COMPRADORA utilizará este documento para processo de usucapião.')
  sub('10.4', 'As partes declaram estar cientes e de pleno acordo com os termos e condições aqui estabelecidos.')
  space()

  // CLÁUSULA 11 — FORO
  clause('CLÁUSULA 11ª', 'DO FORO')
  sub('11.1', `Para dirimir quaisquer controvérsias oriundas do presente contrato, fica eleito o Foro da Comarca de ${d.foro}, com renúncia de qualquer outro, por mais privilegiado que seja.`)
  space()

  // Assinatura
  para(`E, por estarem assim justas e contratadas, firmam as partes o presente instrumento na presença das testemunhas abaixo, na cidade de ${d.cidade}, em ${d.dataContrato}.`)

  return blocks
}
