import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AppSettings,
  ChatMessage,
  Conversation,
  ConversationMemory,
  Document,
  InstalledModel,
  VectorChunk,
} from '../types'

interface VeyraDB extends DBSchema {
  conversations: {
    key: string
    value: Conversation
    indexes: { 'by-updated': number }
  }
  messages: {
    key: string
    value: ChatMessage
    indexes: { 'by-conversation': string; 'by-created': number }
  }
  documents: {
    key: string
    value: Document
    indexes: { 'by-created': number }
  }
  chunks: {
    key: string
    value: VectorChunk
    indexes: { 'by-source': string; 'by-source-type': string }
  }
  summaries: {
    key: string
    value: ConversationMemory
  }
  models: {
    key: string
    value: InstalledModel
  }
  settings: {
    key: string
    value: { key: string; data: AppSettings }
  }
  documentBlobs: {
    key: string
    value: { id: string; blob: Blob }
  }
}

const DB_NAME = 'veyra-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<VeyraDB>> | null = null

export function getDB(): Promise<IDBPDatabase<VeyraDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VeyraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const conversations = db.createObjectStore('conversations', { keyPath: 'id' })
        conversations.createIndex('by-updated', 'updatedAt')

        const messages = db.createObjectStore('messages', { keyPath: 'id' })
        messages.createIndex('by-conversation', 'conversationId')
        messages.createIndex('by-created', 'createdAt')

        const documents = db.createObjectStore('documents', { keyPath: 'id' })
        documents.createIndex('by-created', 'createdAt')

        const chunks = db.createObjectStore('chunks', { keyPath: 'id' })
        chunks.createIndex('by-source', 'sourceId')
        chunks.createIndex('by-source-type', 'sourceType')

        db.createObjectStore('summaries', { keyPath: 'conversationId' })
        db.createObjectStore('models', { keyPath: 'modelId' })
        db.createObjectStore('settings', { keyPath: 'key' })
        db.createObjectStore('documentBlobs', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'es',
  theme: 'dark',
  activeModelId: null,
  ragEnabled: true,
  ragTopK: 5,
  ragTokenBudget: 1200,
  chunkSize: 700,
  chunkOverlap: 0.15,
  temperature: 0.7,
  maxTokens: 2048,
  onboardingComplete: false,
  embeddingModelId: 'Xenova/all-MiniLM-L6-v2',
  activeSpeechModelId: null,
}
