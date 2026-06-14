import jsPDF from 'jspdf'
import { ContractBlock } from './contractTemplates/imovel'

interface PDFState {
  y: number
  pageH: number
  pageW: number
  margin: number
  contentW: number
  lineH: number
}

function newState(): PDFState {
  return { y: 20, pageH: 297, pageW: 210, margin: 18, contentW: 174, lineH: 5.5 }
}

function checkBreak(doc: jsPDF, s: PDFState, needed: number) {
  if (s.y + needed > s.pageH - s.margin) {
    doc.addPage()
    s.y = s.margin
  }
}

function addLines(doc: jsPDF, s: PDFState, lines: string[], extra = 2) {
  const h = lines.length * s.lineH + extra
  checkBreak(doc, s, h)
  doc.text(lines, s.margin, s.y)
  s.y += h
}

function drawBlocks(doc: jsPDF, s: PDFState, blocks: ContractBlock[]) {
  for (const block of blocks) {
    if (block.type === 'spacer') { s.y += 4; continue }

    if (block.type === 'title') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      const lines = doc.splitTextToSize(block.text ?? '', s.contentW)
      checkBreak(doc, s, lines.length * 7 + 4)
      doc.text(lines, s.pageW / 2, s.y, { align: 'center' })
      s.y += lines.length * 7 + 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      continue
    }

    if (block.type === 'subtitle') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(block.text ?? '', s.contentW)
      checkBreak(doc, s, lines.length * s.lineH + 2)
      doc.text(lines, s.margin, s.y)
      s.y += lines.length * s.lineH + 2
      doc.setFont('helvetica', 'normal')
      continue
    }

    if (block.type === 'clause') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      const text = `${block.number} — ${block.text}`
      const lines = doc.splitTextToSize(text, s.contentW)
      checkBreak(doc, s, lines.length * s.lineH + 4)
      s.y += 2
      doc.text(lines, s.margin, s.y)
      s.y += lines.length * s.lineH + 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      continue
    }

    if (block.type === 'subclause') {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const text = `${block.number}. ${block.text}`
      const lines = doc.splitTextToSize(text, s.contentW - 6)
      checkBreak(doc, s, lines.length * s.lineH + 2)
      doc.text(lines, s.margin + 6, s.y)
      s.y += lines.length * s.lineH + 2
      continue
    }

    if (block.type === 'paragraph') {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(block.text ?? '', s.contentW)
      checkBreak(doc, s, lines.length * s.lineH + 2)
      doc.text(lines, s.margin, s.y)
      s.y += lines.length * s.lineH + 2
    }
  }
}

function addSectionHeader(doc: jsPDF, s: PDFState, title: string) {
  checkBreak(doc, s, 14)
  s.y += 2
  doc.setFillColor(240, 240, 250)
  doc.rect(s.margin, s.y - 4, s.contentW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(title, s.margin + 3, s.y)
  s.y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
}

function renderDocSection(doc: jsPDF, s: PDFState, label: string, photos: string[], imgH: number) {
  addSectionHeader(doc, s, label)
  s.y += 4

  const colW = (s.contentW - 6) / 2

  for (let i = 0; i < photos.length; i++) {
    const url = photos[i]
    if (!url) continue

    const x = s.margin + (i % 2) * (colW + 6)
    const caption = i === 0 ? 'Documento (frente)' : 'Titular segurando o documento'

    try {
      if (url.startsWith('data:')) {
        const fmt = url.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(url, fmt, x, s.y, colW, imgH)
      }
    } catch {
      // If image fails, draw placeholder
      doc.setDrawColor(180, 180, 180)
      doc.rect(x, s.y, colW, imgH)
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Foto não disponível', x + colW / 2, s.y + imgH / 2, { align: 'center' })
      doc.setTextColor(0, 0, 0)
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text(caption, x + colW / 2, s.y + imgH + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    if (i % 2 === 1) s.y += imgH + 12
  }

  if (photos.length % 2 !== 0) s.y += imgH + 12
}

function addDocumentsPage(
  doc: jsPDF,
  s: PDFState,
  locadorName: string,
  docsLocador: string[] | undefined,
  locatarioName: string,
  docsLocatario: string[] | undefined,
) {
  const hasLocador = !!docsLocador && docsLocador.some(Boolean)
  const hasLocatario = !!docsLocatario && docsLocatario.some(Boolean)
  if (!hasLocador && !hasLocatario) return

  doc.addPage()
  s.y = s.margin

  // Reduz a altura quando ambos os conjuntos estão na mesma página
  const imgH = hasLocador && hasLocatario ? 70 : 80

  if (hasLocador) {
    renderDocSection(doc, s, `DOCUMENTOS DO LOCADOR — ${locadorName}`, docsLocador!, imgH)
  }

  if (hasLocatario) {
    if (hasLocador) s.y += 6
    renderDocSection(doc, s, `DOCUMENTOS DO LOCATÁRIO — ${locatarioName}`, docsLocatario!, imgH)
  }
}

function addSignaturePage(
  doc: jsPDF,
  s: PDFState,
  locadorName: string,
  locadorSig: string | undefined,
  locatarioName: string,
  locatarioSig: string | undefined,
  testemunha1?: PDFWitness,
  testemunha2?: PDFWitness,
  dataAssinatura?: string,
) {
  doc.addPage()
  s.y = s.margin

  addSectionHeader(doc, s, 'ASSINATURAS')
  s.y += 6

  const colW = (s.contentW - 10) / 2
  const sigH = 40

  const drawSig = (x: number, name: string, label: string, sigData?: string) => {
    if (sigData) {
      try {
        doc.addImage(sigData, 'PNG', x, s.y, colW, sigH)
      } catch {
        doc.setDrawColor(180, 180, 180)
        doc.rect(x, s.y, colW, sigH)
      }
    } else {
      doc.setDrawColor(180, 180, 180)
      doc.rect(x, s.y, colW, sigH)
    }
    doc.setFontSize(9)
    doc.line(x, s.y + sigH + 8, x + colW, s.y + sigH + 8)
    doc.setFont('helvetica', 'bold')
    doc.text(name, x + colW / 2, s.y + sigH + 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + colW / 2, s.y + sigH + 19, { align: 'center' })
  }

  drawSig(s.margin, locadorName, 'LOCADOR', locadorSig)
  drawSig(s.margin + colW + 10, locatarioName, 'LOCATÁRIO', locatarioSig)
  s.y += sigH + 26

  if (testemunha1 || testemunha2) {
    s.y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TESTEMUNHAS:', s.margin, s.y)
    s.y += 4
    doc.setFont('helvetica', 'normal')

    const drawWitness = (x: number, w?: PDFWitness) => {
      if (!w) return
      if (w.signature) {
        try {
          doc.addImage(w.signature, 'PNG', x, s.y, colW, sigH)
        } catch {
          doc.setDrawColor(180, 180, 180)
          doc.rect(x, s.y, colW, sigH)
        }
      } else {
        doc.setFontSize(8)
        doc.setTextColor(180, 130, 0)
        doc.setFont('helvetica', 'italic')
        doc.text('Aguardando assinatura eletrônica', x + colW / 2, s.y + sigH / 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
      }
      doc.line(x, s.y + sigH + 6, x + colW, s.y + sigH + 6)
      doc.setFontSize(9)
      doc.text(`${w.name}`, x + colW / 2, s.y + sigH + 11, { align: 'center' })
      doc.text(`CPF: ${w.cpf ?? ''}  RG: ${w.rg ?? ''}`, x + colW / 2, s.y + sigH + 16, { align: 'center' })
    }

    drawWitness(s.margin, testemunha1)
    drawWitness(s.margin + colW + 10, testemunha2)
    s.y += sigH + 24
  }

  // Timestamp + authenticity note
  s.y += 10
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'italic')
  const ts = dataAssinatura ?? new Date().toLocaleString('pt-BR')
  doc.text(`Assinado eletronicamente em ${ts} — Válido nos termos da MP nº 2.200-2/2001, Art. 10, §2º.`, s.margin, s.y)
  s.y += 5
  doc.text('A autenticidade deste documento pode ser verificada pelos registros de identidade e assinaturas eletrônicas anexados.', s.margin, s.y)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
}

function addPageNumbers(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  const w = 210
  const h = 297
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${total}`, w / 2, h - 8, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }
}

export interface PDFWitness {
  name: string
  cpf?: string
  rg?: string
  signature?: string
}

export interface ContractPDFInput {
  blocks: ContractBlock[]
  contractNumber: string
  locadorName: string
  locatarioName: string
  signatureLocador?: string
  signatureLocatario?: string
  docsLocador?: string[]
  docsLocatario?: string[]
  testemunha1?: PDFWitness
  testemunha2?: PDFWitness
  dataAssinatura?: string
}

export function generateContractPDF(input: ContractPDFInput): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)

  const s = newState()

  // Contract body
  drawBlocks(doc, s, input.blocks)

  // Document photos — Locador e Locatário na mesma página
  addDocumentsPage(
    doc, s,
    input.locadorName, input.docsLocador,
    input.locatarioName, input.docsLocatario,
  )

  // Signature page
  addSignaturePage(
    doc, s,
    input.locadorName,
    input.signatureLocador,
    input.locatarioName,
    input.signatureLocatario,
    input.testemunha1,
    input.testemunha2,
    input.dataAssinatura,
  )

  addPageNumbers(doc)

  return doc
}

export function contractPDFToBlob(doc: jsPDF): Blob {
  return doc.output('blob')
}

export function downloadContractPDF(doc: jsPDF, filename: string) {
  doc.save(filename)
}
