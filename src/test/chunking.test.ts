import { describe, it, expect } from 'vitest'
import { chunkText, normalizeText } from '../utils/chunking'

describe('chunkText', () => {
  it('splits long text into chunks', () => {
    const text = Array(200).fill('word').join(' ')
    const chunks = chunkText(text, { chunkSize: 50, overlap: 0.1 })
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('returns single chunk for short text', () => {
    const chunks = chunkText('Hello world', { chunkSize: 700, overlap: 0.15 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('Hello world')
  })

  it('filters empty chunks', () => {
    const chunks = chunkText('   ', { chunkSize: 700, overlap: 0.15 })
    expect(chunks).toHaveLength(0)
  })
})

describe('normalizeText', () => {
  it('normalizes line endings', () => {
    expect(normalizeText('a\r\nb\rc')).toBe('a\nb\nc')
  })

  it('collapses excessive newlines', () => {
    expect(normalizeText('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('trims whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello')
  })
})
