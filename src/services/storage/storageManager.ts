import type { StorageUsage } from '../../types'
import { chunkRepo } from '../../db/repositories/chunkRepository'
import { conversationRepo } from '../../db/repositories/conversationRepository'
import { documentRepo } from '../../db/repositories/documentRepository'
import { messageRepo } from '../../db/repositories/messageRepository'
import { modelRepo } from '../../db/repositories/settingsRepository'
import { getDB } from '../../db/database'
import { AVAILABLE_MODELS } from '../llm/models'

export interface StorageManager {
  getUsage(): Promise<StorageUsage>
  requestPersistence(): Promise<boolean>
  clearConversationData(): Promise<void>
  clearDocuments(): Promise<void>
  clearEmbeddings(): Promise<void>
  clearModel(modelId: string): Promise<void>
  clearAll(): Promise<void>
}

class LocalStorageManager implements StorageManager {
  async getUsage(): Promise<StorageUsage> {
    const models = await modelRepo.getAll()
    let modelSize = 0
    for (const m of models) {
      if (m.status === 'installed' || m.status === 'active') {
        const info = AVAILABLE_MODELS.find((am) => am.id === m.modelId)
        modelSize += info?.sizeBytes ?? 0
      }
    }

    const docs = await documentRepo.getAll()
    const documents = docs.reduce((sum, d) => sum + d.size, 0)

    const convCount = await conversationRepo.count()
    const msgCount = await messageRepo.count()
    const conversations = (convCount * 200 + msgCount * 500)

    const db = await getDB()
    const chunks = await db.getAll('chunks')
    const embeddings = chunks.reduce((sum, c) => sum + c.embedding.length * 4 + c.text.length, 0)

    return {
      models: modelSize,
      documents,
      conversations,
      embeddings,
      total: modelSize + documents + conversations + embeddings,
    }
  }

  async requestPersistence(): Promise<boolean> {
    if (navigator.storage?.persist) {
      return navigator.storage.persist()
    }
    return false
  }

  async clearConversationData(): Promise<void> {
    const db = await getDB()
    await db.clear('conversations')
    await db.clear('messages')
    await db.clear('summaries')
    const chunks = await db.getAll('chunks')
    const tx = db.transaction('chunks', 'readwrite')
    for (const chunk of chunks) {
      if (chunk.sourceType === 'conversation') {
        await tx.store.delete(chunk.id)
      }
    }
    await tx.done
  }

  async clearDocuments(): Promise<void> {
    const db = await getDB()
    await db.clear('documents')
    await db.clear('documentBlobs')
    const chunks = await db.getAll('chunks')
    const tx = db.transaction('chunks', 'readwrite')
    for (const chunk of chunks) {
      if (chunk.sourceType === 'document') {
        await tx.store.delete(chunk.id)
      }
    }
    await tx.done
  }

  async clearEmbeddings(): Promise<void> {
    await chunkRepo.clear()
  }

  async clearModel(modelId: string): Promise<void> {
    await modelRepo.delete(modelId)
  }

  async clearAll(): Promise<void> {
    const db = await getDB()
    const stores = [
      'conversations', 'messages', 'documents', 'documentBlobs',
      'chunks', 'summaries', 'models', 'settings',
    ] as const
    for (const store of stores) {
      await db.clear(store)
    }
  }
}

export const storageManager = new LocalStorageManager()
