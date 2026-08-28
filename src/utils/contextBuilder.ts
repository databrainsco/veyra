import type { ChatMessage, ConversationMemory, SearchResult, SourceReference } from '../types'
import { estimateTokens } from './helpers'
import { truncateMessagesToBudget } from './generationProfile'
import { VEYRA_SYSTEM_PROMPT } from './systemPrompt'

export interface ContextBuildOptions {
  systemPrompt: string
  summary?: ConversationMemory
  conversationRagResults: SearchResult[]
  globalRagResults: SearchResult[]
  recentMessages: ChatMessage[]
  currentQuestion: string
  maxRecentMessages?: number
  maxInputTokens?: number
}

export interface BuiltContext {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  sources: SourceReference[]
  totalTokens: number
}

function appendRagSection(
  results: SearchResult[],
  sources: SourceReference[],
): string {
  let section = ''
  for (const result of results) {
    const chunk = result.chunk
    section += `\n- ${chunk.text}`
    sources.push({
      type: chunk.sourceType,
      id: chunk.sourceId,
      name: chunk.metadata.documentName ?? chunk.metadata.conversationTitle ?? 'Fuente',
      page: chunk.metadata.page,
      messageId: chunk.metadata.messageId,
      excerpt: chunk.text.slice(0, 150),
    })
  }
  return section
}

export function buildRAGContext(options: ContextBuildOptions): BuiltContext {
  const {
    systemPrompt = VEYRA_SYSTEM_PROMPT,
    summary,
    conversationRagResults,
    globalRagResults,
    recentMessages,
    currentQuestion,
    maxRecentMessages = 10,
    maxInputTokens,
  } = options

  const sources: SourceReference[] = []
  let systemContent = systemPrompt

  if (summary?.summary) {
    systemContent += `\n\nResumen de la conversación:\n${summary.summary}`
  }

  if (conversationRagResults.length > 0) {
    systemContent += `\n\nHistorial relevante de esta conversación (úsalo para recordar lo que el usuario ya preguntó o acordó):${appendRagSection(conversationRagResults, sources)}`
  }

  if (globalRagResults.length > 0) {
    systemContent += `\n\nMemoria de documentos y otras conversaciones:${appendRagSection(globalRagResults, sources)}`
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
  ]

  const recent = recentMessages.slice(-maxRecentMessages)
  const lastMessage = recent[recent.length - 1]
  const lastIsCurrentQuestion =
    lastMessage?.role === 'user' && lastMessage.content === currentQuestion

  for (const msg of recent) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  if (!lastIsCurrentQuestion) {
    messages.push({ role: 'user', content: currentQuestion })
  }

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
    .map((m) => `${m.role}: ${m.content.slice(0, 2000)}`)
    .join('\n')

  return `Resume la siguiente conversación de forma concisa, capturando los puntos clave y decisiones importantes:\n\n${conversationText}`
}
