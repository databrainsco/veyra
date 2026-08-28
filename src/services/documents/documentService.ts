import * as pdfjsLib from 'pdfjs-dist'
import type { Document } from '../../types'
import { documentRepo } from '../../db/repositories/documentRepository'
import { ragService } from '../rag/ragService'
import { generateId, hashFile, sanitizeFilename } from '../../utils/helpers'
import { normalizeText } from '../../utils/chunking'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function processDocument(file: File): Promise<Document> {
  const hash = await hashFile(file)
  const existing = (await documentRepo.getAll()).find((d) => d.hash === hash)
  if (existing) return existing

  const doc: Document = {
    id: generateId(),
    name: sanitizeFilename(file.name),
    mimeType: file.type,
    size: file.size,
    hash,
    createdAt: Date.now(),
    status: 'pending',
  }

  await documentRepo.create(doc, file)

  try {
    await documentRepo.update({ ...doc, status: 'indexing' })

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const result = await extractPdfText(file)
      doc.pageCount = result.pageCount
      await ragService.indexDocument(doc.id, doc.name, '', result.pageTexts)
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      await ragService.indexDocument(doc.id, doc.name, normalizeText(text))
    } else {
      throw new Error('Tipo de archivo no soportado')
    }

    doc.status = 'indexed'
    await documentRepo.update(doc)
    return doc
  } catch (error) {
    doc.status = 'error'
    doc.errorMessage = error instanceof Error ? error.message : 'Error de indexación'
    await documentRepo.update(doc)
    throw error
  }
}

async function extractPdfText(
  file: File | Blob,
): Promise<{ pageCount: number; pageTexts: Array<{ page: number; text: string }> }> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: Array<{ page: number; text: string }> = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push({ page: i, text: normalizeText(text) })
  }

  return { pageCount: pdf.numPages, pageTexts }
}

export async function getDocumentText(docId: string): Promise<string> {
  const blob = await documentRepo.getBlob(docId)
  if (!blob) throw new Error('Documento no encontrado')

  if (blob.type === 'application/pdf') {
    const result = await extractPdfText(blob)
    return result.pageTexts.map((p) => p.text).join('\n\n')
  }

  return blob.text()
}
