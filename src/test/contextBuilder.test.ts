import { describe, it, expect } from 'vitest'
import { buildRAGContext } from '../utils/contextBuilder'
import type { SearchResult } from '../types'

describe('buildRAGContext', () => {
  it('includes RAG results in system prompt', () => {
    const ragResults: SearchResult[] = [
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
      ragResults,
      recentMessages: [],
      currentQuestion: '¿Dónde se almacenan los documentos?',
      maxRagTokens: 4000,
    })

    expect(result.messages[0]!.content).toContain('local-first')
    expect(result.sources).toHaveLength(1)
    expect(result.messages[result.messages.length - 1]!.content).toBe(
      '¿Dónde se almacenan los documentos?',
    )
  })

  it('respects RAG token budget', () => {
    const ragResults: SearchResult[] = Array.from({ length: 20 }, (_, i) => ({
      score: 0.9 - i * 0.01,
      chunk: {
        id: `${i}`,
        sourceType: 'document' as const,
        sourceId: 'doc-1',
        text: 'A'.repeat(400),
        embedding: [],
        metadata: {},
      },
    }))

    const result = buildRAGContext({
      systemPrompt: 'Test',
      ragResults,
      recentMessages: [],
      currentQuestion: 'test',
      maxRagTokens: 100,
    })

    expect(result.sources.length).toBeLessThan(20)
  })
})
