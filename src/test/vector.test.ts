import { describe, it, expect } from 'vitest'
import { cosineSimilarity, normalizeVector } from '../utils/vector'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0)
  })

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0)
  })
})

describe('normalizeVector', () => {
  it('normalizes to unit length', () => {
    const normalized = normalizeVector([3, 4])
    const length = Math.sqrt(normalized.reduce((s, x) => s + x * x, 0))
    expect(length).toBeCloseTo(1)
  })
})
