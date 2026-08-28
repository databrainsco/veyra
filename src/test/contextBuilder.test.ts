import { describe, it, expect } from 'vitest'
import { buildRAGContext } from '../utils/contextBuilder'
import type { SearchResult } from '../types'

describe('buildRAGContext', () => {
  it('includes conversation RAG in system prompt', () => {
    const conversationRagResults: SearchResult[] = [
      {
        score: 0.9,
        chunk: {
          id: '1',
          sourceType: 'conversation',
          sourceId: 'conv-1',
          text: 'user: Quiero un proyecto de luciérnagas',
          embedding: [],
          metadata: { conversationTitle: 'Ideas' },
        },
      },
    ]

    const result = buildRAGContext({
      systemPrompt: 'Test system',
      conversationRagResults,
      globalRagResults: [],
      recentMessages: [],
      currentQuestion: '¿Qué más puedo agregar?',
    })

    expect(result.messages[0]!.content).toContain('luciérnagas')
    expect(result.messages[0]!.content).toContain('esta conversación')
    expect(result.sources).toHaveLength(1)
  })

  it('includes global RAG in system prompt', () => {
    const globalRagResults: SearchResult[] = [
      {
        score: 0.9,
        chunk: {
          id: '1',
          sourceType: 'document',
          sourceId: 'doc-1',
          text: 'Veyra utiliza una arquitectura local-first.',
          embedding: [],
          metadata: { documentName: 'test.txt' },
        },
      },
    ]

    const result = buildRAGContext({
      systemPrompt: 'Test system',
      conversationRagResults: [],
      globalRagResults,
      recentMessages: [],
      currentQuestion: '¿Dónde se almacenan los documentos?',
    })

    expect(result.messages[0]!.content).toContain('local-first')
    expect(result.sources).toHaveLength(1)
  })

  it('does not duplicate the current user question', () => {
    const result = buildRAGContext({
      systemPrompt: 'Test',
      conversationRagResults: [],
      globalRagResults: [],
      recentMessages: [
        {
          id: '1',
          conversationId: 'c',
          role: 'user',
          content: 'Hola',
          createdAt: 1,
        },
        {
          id: '2',
          conversationId: 'c',
          role: 'assistant',
          content: 'Hola, ¿en qué ayudo?',
          createdAt: 2,
        },
        {
          id: '3',
          conversationId: 'c',
          role: 'user',
          content: '¿Recuerdas mi tema?',
          createdAt: 3,
        },
      ],
      currentQuestion: '¿Recuerdas mi tema?',
    })

    const userMessages = result.messages.filter((m) => m.role === 'user')
    expect(userMessages).toHaveLength(2)
    expect(userMessages[userMessages.length - 1]!.content).toBe('¿Recuerdas mi tema?')
  })
})
