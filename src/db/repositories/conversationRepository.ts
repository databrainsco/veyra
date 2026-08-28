import { getDB } from '../database'
import type { Conversation } from '../../types'

export class ConversationRepository {
  async getAll(): Promise<Conversation[]> {
    const db = await getDB()
    const conversations = await db.getAll('conversations')
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async getById(id: string): Promise<Conversation | undefined> {
    const db = await getDB()
    return db.get('conversations', id)
  }

  async create(conversation: Conversation): Promise<void> {
    const db = await getDB()
    await db.put('conversations', conversation)
  }

  async update(conversation: Conversation): Promise<void> {
    const db = await getDB()
    await db.put('conversations', conversation)
  }

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('conversations', id)
    const messages = await db.getAllFromIndex('messages', 'by-conversation', id)
    const tx = db.transaction(['messages', 'chunks', 'summaries'], 'readwrite')
    for (const msg of messages) {
      await tx.objectStore('messages').delete(msg.id)
    }
    const chunks = await db.getAllFromIndex('chunks', 'by-source', id)
    for (const chunk of chunks) {
      await tx.objectStore('chunks').delete(chunk.id)
    }
    await tx.objectStore('summaries').delete(id)
    await tx.done
  }

  async search(query: string): Promise<Conversation[]> {
    const all = await this.getAll()
    const lower = query.toLowerCase()
    return all.filter((c) => c.title.toLowerCase().includes(lower))
  }

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('conversations')
  }
}

export const conversationRepo = new ConversationRepository()
