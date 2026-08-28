import type { VectorChunk, SearchOptions, SearchResult, SourceReference } from '../../types'
import { getEmbeddingService } from '../embeddings/TransformersEmbeddingService'
import { vectorStore } from './vectorStore'
import { buildRAGContext } from '../../utils/contextBuilder'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { summaryRepo } from '../../db/repositories/settingsRepository'
import type { ChatMessage } from '../../types'
import { chunkText, normalizeText } from '../../utils/chunking'
import { generateId } from '../../utils/helpers'
import {
  getGenerationProfile,
  getMaxInputTokens,
} from '../../utils/generationProfile'

export class RAGService {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const embeddingService = getEmbeddingService()
    await embeddingService.initialize()
    const embedding = await embeddingService.embed(query)
    const settings = await settingsRepo.get()
    return vectorStore.search(embedding, {
      topK: options?.topK ?? settings.ragTopK,
      ...options,
    })
  }

  async buildContext(
    conversationId: string,
    question: string,
    recentMessages: ChatMessage[],
  ): Promise<{
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    sources: SourceReference[]
  }> {
    const settings = await settingsRepo.get()
    const summary = await summaryRepo.get(conversationId)
    const profile = await getGenerationProfile()
    const maxRagTokens = Math.min(settings.ragTokenBudget, profile.maxRagTokens)
    const maxOutputTokens = Math.min(settings.maxTokens, profile.maxOutputTokens)
    const contextWindow = profile.contextWindowSize
    const maxInputTokens = getMaxInputTokens(contextWindow, maxOutputTokens)

    let ragResults: SearchResult[] = []
    if (settings.ragEnabled) {
      ragResults = await this.search(question)
    }

    const built = buildRAGContext({
      systemPrompt: 'Eres Veyra, una IA personal local. Responde en español.',
      summary,
      ragResults,
      recentMessages,
      currentQuestion: question,
      maxRagTokens,
      maxRecentMessages: profile.maxRecentMessages,
      maxInputTokens,
    })

    return { messages: built.messages, sources: built.sources }
  }

  async indexConversation(
    conversationId: string,
    conversationTitle: string,
    messages: ChatMessage[],
  ): Promise<number> {
    const settings = await settingsRepo.get()
    const embeddingService = getEmbeddingService()
    await embeddingService.initialize()

    const textContent = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const normalized = normalizeText(textContent)
    const chunks = chunkText(normalized, {
      chunkSize: settings.chunkSize,
      overlap: settings.chunkOverlap,
    })

    if (chunks.length === 0) return 0

    const embeddings = await embeddingService.embedBatch(chunks)
    const vectorChunks: VectorChunk[] = chunks.map((text, i) => ({
      id: generateId(),
      sourceType: 'conversation' as const,
      sourceId: conversationId,
      text,
      embedding: embeddings[i]!,
      metadata: {
        conversationId,
        position: i,
        conversationTitle,
      },
    }))

    await vectorStore.add(vectorChunks)
    return vectorChunks.length
  }

  async indexDocument(
    documentId: string,
    documentName: string,
    text: string,
    pageTexts?: Array<{ page: number; text: string }>,
  ): Promise<number> {
    const settings = await settingsRepo.get()
    const embeddingService = getEmbeddingService()
    await embeddingService.initialize()

    let allChunks: Array<{ text: string; page?: number }> = []

    if (pageTexts) {
      for (const pt of pageTexts) {
        const chunks = chunkText(normalizeText(pt.text), {
          chunkSize: settings.chunkSize,
          overlap: settings.chunkOverlap,
        })
        allChunks.push(...chunks.map((text) => ({ text, page: pt.page })))
      }
    } else {
      const chunks = chunkText(normalizeText(text), {
        chunkSize: settings.chunkSize,
        overlap: settings.chunkOverlap,
      })
      allChunks = chunks.map((text) => ({ text }))
    }

    if (allChunks.length === 0) return 0

    const texts = allChunks.map((c) => c.text)
    const embeddings = await embeddingService.embedBatch(texts)

    const vectorChunks: VectorChunk[] = allChunks.map((chunk, i) => ({
      id: generateId(),
      sourceType: 'document' as const,
      sourceId: documentId,
      text: chunk.text,
      embedding: embeddings[i]!,
      metadata: {
        page: chunk.page,
        position: i,
        documentName,
      },
    }))

    await vectorStore.add(vectorChunks)
    return vectorChunks.length
  }

  async getStats(): Promise<{ chunks: number }> {
    const count = await vectorStore.count()
    return { chunks: count }
  }
}

export const ragService = new RAGService()
