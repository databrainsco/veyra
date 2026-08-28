import { getDB, DEFAULT_SETTINGS } from '../database'
import type { AppSettings, ConversationMemory, InstalledModel } from '../../types'

export class SettingsRepository {
  async get(): Promise<AppSettings> {
    const db = await getDB()
    const record = await db.get('settings', 'app')
    return record?.data ?? { ...DEFAULT_SETTINGS }
  }

  async save(settings: AppSettings): Promise<void> {
    const db = await getDB()
    await db.put('settings', { key: 'app', data: settings })
  }

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get()
    const updated = { ...current, ...partial }
    await this.save(updated)
    return updated
  }
}

export class SummaryRepository {
  async get(conversationId: string): Promise<ConversationMemory | undefined> {
    const db = await getDB()
    return db.get('summaries', conversationId)
  }

  async save(memory: ConversationMemory): Promise<void> {
    const db = await getDB()
    await db.put('summaries', memory)
  }

  async getAll(): Promise<ConversationMemory[]> {
    const db = await getDB()
    return db.getAll('summaries')
  }
}

export class ModelRepository {
  async getAll(): Promise<InstalledModel[]> {
    const db = await getDB()
    return db.getAll('models')
  }

  async get(modelId: string): Promise<InstalledModel | undefined> {
    const db = await getDB()
    return db.get('models', modelId)
  }

  async save(model: InstalledModel): Promise<void> {
    const db = await getDB()
    await db.put('models', model)
  }

  async delete(modelId: string): Promise<void> {
    const db = await getDB()
    await db.delete('models', modelId)
  }
}

export const settingsRepo = new SettingsRepository()
export const summaryRepo = new SummaryRepository()
export const modelRepo = new ModelRepository()
