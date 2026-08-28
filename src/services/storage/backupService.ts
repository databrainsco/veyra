import type { BackupData } from '../../types'
import { conversationRepo } from '../../db/repositories/conversationRepository'
import { messageRepo } from '../../db/repositories/messageRepository'
import { documentRepo } from '../../db/repositories/documentRepository'
import { chunkRepo } from '../../db/repositories/chunkRepository'
import { settingsRepo, summaryRepo } from '../../db/repositories/settingsRepository'

export async function exportBackup(): Promise<BackupData> {
  const settings = await settingsRepo.get()
  const conversations = await conversationRepo.getAll()
  const documents = await documentRepo.getAll()
  const summaries = await summaryRepo.getAll()

  const messages = []
  for (const conv of conversations) {
    const msgs = await messageRepo.getByConversation(conv.id)
    messages.push(...msgs)
  }

  const db = await import('../../db/database')
  const idb = await db.getDB()
  const chunks = await idb.getAll('chunks')

  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    conversations,
    messages,
    documents,
    chunks,
    summaries,
    settings,
    embeddingModelId: settings.embeddingModelId,
  }
}

export async function importBackup(
  data: BackupData,
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ conversations: number; documents: number; chunks: number }> {
  if (mode === 'replace') {
    const { storageManager } = await import('../storage/storageManager')
    await storageManager.clearAll()
  }

  for (const conv of data.conversations) {
    await conversationRepo.create(conv)
  }

  for (const msg of data.messages) {
    await messageRepo.create(msg)
  }

  for (const doc of data.documents) {
    const blob = new Blob([''], { type: doc.mimeType })
    await documentRepo.create(doc, blob)
  }

  if (data.chunks.length > 0) {
    await chunkRepo.add(data.chunks)
  }

  for (const summary of data.summaries) {
    await summaryRepo.save(summary)
  }

  await settingsRepo.save(data.settings)

  return {
    conversations: data.conversations.length,
    documents: data.documents.length,
    chunks: data.chunks.length,
  }
}

export function downloadBackup(data: BackupData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `veyra-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
