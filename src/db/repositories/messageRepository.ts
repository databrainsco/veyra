import { getDB } from '../database'
import type { ChatMessage } from '../../types'

export class MessageRepository {
  async getByConversation(conversationId: string): Promise<ChatMessage[]> {
    const db = await getDB()
    const messages = await db.getAllFromIndex('messages', 'by-conversation', conversationId)
    return messages.sort((a, b) => a.createdAt - b.createdAt)
  }

  async getById(id: string): Promise<ChatMessage | undefined> {
    const db = await getDB()
    return db.get('messages', id)
  }

  async create(message: ChatMessage): Promise<void> {
    const db = await getDB()
    await db.put('messages', message)
  }

  async update(message: ChatMessage): Promise<void> {
    const db = await getDB()
    await db.put('messages', message)
  }

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('messages', id)
  }

  async deleteAfter(conversationId: string, afterTimestamp: number): Promise<void> {
    const messages = await this.getByConversation(conversationId)
    const db = await getDB()
    const tx = db.transaction('messages', 'readwrite')
    for (const msg of messages) {
      if (msg.createdAt > afterTimestamp) {
        await tx.store.delete(msg.id)
      }
    }
    await tx.done
  }

  async deleteFrom(conversationId: string, fromTimestamp: number): Promise<void> {
    const messages = await this.getByConversation(conversationId)
    const db = await getDB()
    const tx = db.transaction('messages', 'readwrite')
    for (const msg of messages) {
      if (msg.createdAt >= fromTimestamp) {
        await tx.store.delete(msg.id)
      }
    }
    await tx.done
  }

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('messages')
  }
}

export const messageRepo = new MessageRepository()
