import type { ChatMessage, ConversationMemory, SearchResult, SourceReference } from '../types'
import { estimateTokens, truncateToTokenBudget } from './helpers'
import { truncateMessagesToBudget } from './generationProfile'

export interface ContextBuildOptions {
  systemPrompt: string
  summary?: ConversationMemory
  ragResults: SearchResult[]
  recentMessages: ChatMessage[]
  currentQuestion: string
  maxRagTokens: number
  maxRecentMessages?: number
  maxInputTokens?: number
}

export interface BuiltContext {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  sources: SourceReference[]
  totalTokens: number
}

const DEFAULT_SYSTEM_PROMPT = `Eres Veyra, una IA personal que vive en el dispositivo del usuario.
Responde de forma clara, útil y concisa en español.
Cuando uses información de la memoria o documentos del usuario, indícalo naturalmente.
Si no tienes información suficiente, dilo honestamente.`

export function buildRAGContext(options: ContextBuildOptions): BuiltContext {
  const {
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    summary,
    ragResults,
    recentMessages,
    currentQuestion,
    maxRagTokens,
    maxRecentMessages = 10,
    maxInputTokens,
  } = options

  const sources: SourceReference[] = []
  let ragContext = ''
  let ragTokens = 0

  for (const result of ragResults) {
    const chunk = result.chunk
    const chunkTokens = estimateTokens(chunk.text)
    if (ragTokens + chunkTokens > maxRagTokens) break

    ragContext += `\n- ${chunk.text}`
    ragTokens += chunkTokens

    sources.push({
      type: chunk.sourceType,
      id: chunk.sourceId,
      name: chunk.metadata.documentName ?? chunk.metadata.conversationTitle ?? 'Fuente',
      page: chunk.metadata.page,
      messageId: chunk.metadata.messageId,
      excerpt: chunk.text.slice(0, 150),
    })
  }

  let systemContent = systemPrompt

  if (summary?.summary) {
    systemContent += `\n\nResumen de la conversación:\n${summary.summary}`
  }

  if (ragContext) {
    systemContent += `\n\nMemoria relevante:${ragContext}`
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
  ]

  const recent = recentMessages.slice(-maxRecentMessages)
  for (const msg of recent) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: currentQuestion })

  let finalMessages = messages
  if (maxInputTokens) {
    const asChatMessages: ChatMessage[] = messages.map((m, i) => ({
      id: `ctx-${i}`,
      conversationId: 'context',
      role: m.role,
      content: m.content,
      createdAt: Date.now(),
    }))
    finalMessages = truncateMessagesToBudget(asChatMessages, maxInputTokens).map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))
  }

  const totalTokens = finalMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0)

  return { messages: finalMessages, sources, totalTokens }
}

export function buildSummaryPrompt(messages: ChatMessage[]): string {
  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${truncateToTokenBudget(m.content, 500)}`)
    .join('\n')

  return `Resume la siguiente conversación de forma concisa, capturando los puntos clave y decisiones importantes:\n\n${conversationText}`
}
