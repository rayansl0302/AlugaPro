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
  const para = (text: string) => add({ type: 'paragraph', text })
  const space = () => add({ type: 'spacer' })

  // Cláusulas e subcláusulas são numeradas automaticamente, na ordem em que
  // são declaradas — isso evita números "pulados" (ex: 3ª, 5ª) quando uma
  // cláusula condicional (como a de origem da posse) não entra no contrato.
  let clauseNum = 0
  let subNum = 0
  const clause = (text: string) => {
    clauseNum += 1
    subNum = 0
    add({ type: 'clause', number: `CLÁUSULA ${clauseNum}ª`, text })
    return clauseNum
  }
  const sub = (text: string) => {
    subNum += 1
    add({ type: 'subclause', number: `${clauseNum}.${subNum}`, text })
  }

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

  // CLÁUSULA — OBJETO
  clause('DO OBJETO')
  sub(`O presente contrato tem por objeto a cessão de direitos possessórios do terreno ${d.terrenoCoordenadas ? `localizado nas coordenadas ${d.terrenoCoordenadas}, ` : ''}situado na ${d.terrenoEndereco}.`)
  sub(`Situação: ${d.terrenoDescricao}`)
  space()

  // CLÁUSULA — PREÇO E FORMA DE PAGAMENTO
  clause('DO PREÇO E DA FORMA DE PAGAMENTO')
  sub(`O valor total da venda é de ${valor} (${d.precoExtenso}).`)
  sub(`Forma de pagamento: ${d.formaPagamento}.`)
  sub('O VENDEDOR declara ter recebido o valor total da venda e nada mais ter a receber da COMPRADORA, dando-lhe plena, geral e irrevogável quitação.')
  space()

  // CLÁUSULA — HISTÓRICO DA TRANSAÇÃO
  clause('DO HISTÓRICO DA TRANSAÇÃO')
  sub('As partes declaram que o pagamento foi realizado anteriormente, conforme descrito na cláusula de preço e forma de pagamento acima.')
  sub('Por acordo verbal entre as partes, a COMPRADORA foi autorizada pelo VENDEDOR a construir no terreno antes da formalização final deste contrato.')
  sub('A construção atualmente existente no local foi erguida pela COMPRADORA com anuência e autorização expressa do VENDEDOR.')
  sub('O presente contrato visa formalizar e regularizar a situação de fato já existente entre as partes.')
  space()

  // CLÁUSULA — ORIGEM DA POSSE DO VENDEDOR (condicional)
  if (d.origemPosse) {
    clause('DA ORIGEM DA POSSE DO VENDEDOR')
    const origemSubRef = `${clauseNum}.1`
    sub(d.origemPosse)
    sub(`A COMPRADORA declara estar ciente e de pleno acordo com a origem e a forma de aquisição da posse do terreno pelo VENDEDOR, conforme descrito na cláusula ${origemSubRef}, celebrando este contrato com pleno conhecimento dessas circunstâncias.`)
    sub('Em razão do disposto nesta cláusula, o VENDEDOR não responderá, em nenhuma hipótese, por eventual questionamento, reivindicação, ação judicial, desapropriação ou qualquer outro ato de terceiros — incluindo o Poder Público — relacionado à origem, legitimidade ou regularidade da posse do terreno anterior a este contrato, tendo a COMPRADORA assumido plena ciência e aceitado os riscos correspondentes no ato da celebração deste instrumento.')
    space()
  }

  // CLÁUSULA — DECLARAÇÕES DO VENDEDOR
  clause('DAS DECLARAÇÕES DO VENDEDOR')
  sub('O VENDEDOR declara que: (a) possui direitos possessórios sobre o terreno objeto deste contrato; (b) o terreno não possui documentação registral formal; (c) não tem conhecimento de débitos pendentes sobre o terreno; (d) não existem litígios ou disputas conhecidas sobre a área; (e) cede voluntariamente seus direitos possessórios à COMPRADORA.')
  space()

  // CLÁUSULA — CESSÃO DE DIREITOS POSSESSÓRIOS
  clause('DA CESSÃO DE DIREITOS POSSESSÓRIOS')
  sub('O VENDEDOR cede definitivamente à COMPRADORA todos os seus direitos possessórios sobre o terreno descrito na cláusula do objeto.')
  sub('A posse plena e definitiva do terreno é transferida à COMPRADORA na data de assinatura deste contrato.')
  sub('A COMPRADORA fica autorizada, desde já, a exercer plena posse, uso e fruição do terreno e da construção nele existente, podendo deles dispor livremente.')
  space()

  // CLÁUSULA — RESPONSABILIDADES E OBRIGAÇÕES
  clause('DAS RESPONSABILIDADES E OBRIGAÇÕES')
  sub('A partir da assinatura deste contrato, a COMPRADORA assume integral responsabilidade pelo terreno, incluindo: pagamento de IPTU e demais tributos incidentes; taxas e contribuições municipais; manutenção e conservação; cumprimento de normas urbanísticas e ambientais.')
  sub('O VENDEDOR exonera-se completamente de qualquer responsabilidade sobre o imóvel após a assinatura deste contrato.')
  space()

  // CLÁUSULA — GARANTIAS PARA A COMPRADORA
  clause('DAS GARANTIAS PARA A COMPRADORA')
  sub('Não interferência: o VENDEDOR compromete-se a nunca interferir, questionar ou reivindicar qualquer direito sobre o terreno ou a construção nele existente.')
  sub('Colaboração para usucapião: o VENDEDOR compromete-se a colaborar e fornecer os documentos necessários para eventual processo de usucapião pela COMPRADORA.')
  sub('Proteção contra terceiros: caso terceiros questionem os direitos da COMPRADORA, o VENDEDOR prestará total colaboração para defendê-los.')
  sub('Renúncia total: o VENDEDOR renuncia definitiva e irrevogavelmente a qualquer direito presente ou futuro sobre o terreno e a construção nele existente.')
  space()

  // CLÁUSULA — REGISTRO E ESCRITURA
  clause('DO REGISTRO E DA ESCRITURA')
  sub('Este contrato produz todos os efeitos legais entre as partes e seus sucessores.')
  sub('Este instrumento servirá como prova da cessão de direitos possessórios para fins de usucapião.')
  sub('A COMPRADORA poderá utilizar este documento em eventual processo judicial de usucapião.')
  space()

  // CLÁUSULA — IRREVERSIBILIDADE
  clause('DA IRREVERSIBILIDADE')
  sub('O presente contrato é irrevogável e irretratável, não podendo ser desfeito por nenhuma das partes, constituindo título hábil para a cessão de direitos possessórios aqui tratada.')
  space()

  // CLÁUSULA — DISPOSIÇÕES GERAIS
  clause('DAS DISPOSIÇÕES GERAIS')
  sub('Este contrato obriga as partes e seus sucessores a qualquer título.')
  sub('Qualquer alteração a este contrato deve ser feita por escrito e assinada por ambas as partes.')
  sub('O VENDEDOR declara estar ciente de que a COMPRADORA utilizará este documento para processo de usucapião.')
  sub('As partes declaram estar cientes e de pleno acordo com os termos e condições aqui estabelecidos.')
  space()

  // CLÁUSULA — FORO
  clause('DO FORO')
  sub(`Para dirimir quaisquer controvérsias oriundas do presente contrato, fica eleito o Foro da Comarca de ${d.foro}, com renúncia de qualquer outro, por mais privilegiado que seja.`)
  space()

  // Assinatura
  para(`E, por estarem assim justas e contratadas, firmam as partes o presente instrumento na presença das testemunhas abaixo, na cidade de ${d.cidade}, em ${d.dataContrato}.`)

  return blocks
}
