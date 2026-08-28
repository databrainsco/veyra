import type { VectorChunk, SearchOptions, SearchResult, SourceReference } from '../../types'
import { getEmbeddingService } from '../embeddings/TransformersEmbeddingService'
import { vectorStore } from './vectorStore'
import { chunkRepo } from '../../db/repositories/chunkRepository'
import { buildRAGContext } from '../../utils/contextBuilder'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { summaryRepo } from '../../db/repositories/settingsRepository'
import type { ChatMessage } from '../../types'
import { chunkText, normalizeText } from '../../utils/chunking'
import { generateId, estimateTokens } from '../../utils/helpers'
import {
  getGenerationProfile,
  getMaxInputTokens,
} from '../../utils/generationProfile'
import { detectDeviceCapabilities, isMobilePlatform } from '../../utils/device'
import { VEYRA_SYSTEM_PROMPT } from '../../utils/systemPrompt'

function applyTokenBudget(results: SearchResult[], budget: number): SearchResult[] {
  if (budget <= 0) return []

  const kept: SearchResult[] = []
  let used = 0
  for (const result of results) {
    const tokens = estimateTokens(result.chunk.text)
    if (used + tokens > budget) break
    kept.push(result)
    used += tokens
  }
  return kept
}

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

  async ensureConversationIndexed(
    conversationId: string,
    conversationTitle: string,
    messages: ChatMessage[],
  ): Promise<void> {
    const contentMessages = messages.filter((m) => m.role !== 'system')
    if (contentMessages.length < 2) return

    const existing = await chunkRepo.getBySource(conversationId)
    if (existing.length > 0 && existing.length >= Math.ceil(contentMessages.length / 2)) {
      return
    }

    await this.indexConversation(conversationId, conversationTitle, messages)
  }

  async buildContext(
    conversationId: string,
    question: string,
    recentMessages: ChatMessage[],
    conversationTitle: string,
  ): Promise<{
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    sources: SourceReference[]
  }> {
    const settings = await settingsRepo.get()
    const capabilities = await detectDeviceCapabilities()
    const isMobile = isMobilePlatform(capabilities)
    const useGlobalRag = settings.ragEnabled && !isMobile
    const summary = await summaryRepo.get(conversationId)
    const profile = await getGenerationProfile()
    const maxRagTokens = Math.min(settings.ragTokenBudget, profile.maxRagTokens)
    const maxOutputTokens = Math.min(settings.maxTokens, profile.maxOutputTokens)
    const contextWindow = profile.contextWindowSize
    const maxInputTokens = getMaxInputTokens(contextWindow, maxOutputTokens)

    const conversationTokenBudget = isMobile
      ? Math.min(400, maxRagTokens || 400)
      : Math.max(300, Math.floor(maxRagTokens * 0.55))
    const globalTokenBudget = useGlobalRag
      ? Math.max(200, maxRagTokens - conversationTokenBudget)
      : 0

    await this.ensureConversationIndexed(conversationId, conversationTitle, recentMessages)

    let conversationRagResults: SearchResult[] = []
    try {
      conversationRagResults = await this.search(question, {
        sourceType: 'conversation',
        sourceId: conversationId,
        topK: isMobile ? 3 : settings.ragTopK,
      })
      conversationRagResults = applyTokenBudget(conversationRagResults, conversationTokenBudget)
    } catch {
      conversationRagResults = []
    }

    let globalRagResults: SearchResult[] = []
    if (useGlobalRag) {
      try {
        globalRagResults = await this.search(question, { topK: settings.ragTopK })
        globalRagResults = globalRagResults.filter(
          (result) => result.chunk.sourceId !== conversationId,
        )
        globalRagResults = applyTokenBudget(globalRagResults, globalTokenBudget)
      } catch {
        globalRagResults = []
      }
    }

    const built = buildRAGContext({
      systemPrompt: VEYRA_SYSTEM_PROMPT,
      summary,
      conversationRagResults,
      globalRagResults,
      recentMessages,
      currentQuestion: question,
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

    await vectorStore.deleteBySource(conversationId)

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
