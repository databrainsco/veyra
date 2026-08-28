export type DocumentStatus = 'pending' | 'indexing' | 'indexed' | 'error'

export type ModelStatus =
  | 'not_installed'
  | 'downloading'
  | 'installed'
  | 'loading'
  | 'active'
  | 'error'

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface MessageMetadata {
  sources?: SourceReference[]
  ragUsed?: boolean
  edited?: boolean
  regenerated?: boolean
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  createdAt: number
  metadata?: MessageMetadata
}

export interface Document {
  id: string
  name: string
  mimeType: string
  size: number
  hash: string
  createdAt: number
  pageCount?: number
  status: DocumentStatus
  errorMessage?: string
}

export interface VectorChunk {
  id: string
  sourceType: 'document' | 'conversation'
  sourceId: string
  text: string
  embedding: number[]
  metadata: {
    page?: number
    conversationId?: string
    messageId?: string
    position?: number
    documentName?: string
    conversationTitle?: string
  }
}

export interface ConversationMemory {
  conversationId: string
  summary: string
  updatedAt: number
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  sizeBytes: number
  quantization: string
  contextLength: number
  backend: 'webgpu' | 'wasm' | 'unknown'
  requirements: string[]
}

export interface InstalledModel {
  modelId: string
  status: ModelStatus
  installedAt?: number
  downloadProgress?: number
  downloadedBytes?: number
  totalBytes?: number
  errorMessage?: string
}

export interface GenerationOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  stopSequences?: string[]
}

export interface SearchOptions {
  topK?: number
  sourceType?: 'document' | 'conversation'
  sourceId?: string
  minScore?: number
}

export interface SearchResult {
  chunk: VectorChunk
  score: number
}

export interface SourceReference {
  type: 'document' | 'conversation'
  id: string
  name: string
  page?: number
  messageId?: string
  excerpt: string
}

export interface StorageUsage {
  models: number
  documents: number
  conversations: number
  embeddings: number
  total: number
}

export interface AppSettings {
  language: 'es' | 'en'
  theme: 'dark' | 'light' | 'system'
  activeModelId: string | null
  ragEnabled: boolean
  ragTopK: number
  ragTokenBudget: number
  chunkSize: number
  chunkOverlap: number
  temperature: number
  maxTokens: number
  onboardingComplete: boolean
  embeddingModelId: string
}

export interface DeviceCapabilities {
  webgpu: boolean
  platform: string
  browser: string
  estimatedMemoryGB: number | null
  storageQuota: number | null
  storageUsage: number | null
}

export interface BackupData {
  version: string
  exportedAt: number
  conversations: Conversation[]
  messages: ChatMessage[]
  documents: Document[]
  chunks: VectorChunk[]
  summaries: ConversationMemory[]
  settings: AppSettings
  embeddingModelId: string
}

export type VeyraErrorCode =
  | 'MODEL_NOT_SUPPORTED'
  | 'MODEL_DOWNLOAD_FAILED'
  | 'MODEL_LOAD_FAILED'
  | 'WEBGPU_UNAVAILABLE'
  | 'INSUFFICIENT_STORAGE'
  | 'EMBEDDING_FAILED'
  | 'PDF_PARSE_FAILED'
  | 'INDEXING_FAILED'
  | 'VECTOR_SEARCH_FAILED'
  | 'CONTEXT_TOO_LARGE'
  | 'QUOTA_EXCEEDED'
  | 'OFFLINE'

export interface VeyraError {
  code: VeyraErrorCode
  message: string
  details?: string
}
