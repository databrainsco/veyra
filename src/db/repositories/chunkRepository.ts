import { getDB } from '../database'
import type { VectorChunk, SearchOptions, SearchResult } from '../../types'
import { cosineSimilarity } from '../../utils/vector'

export class ChunkRepository {
  async add(chunks: VectorChunk[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('chunks', 'readwrite')
    for (const chunk of chunks) {
      await tx.store.put(chunk)
    }
    await tx.done
  }

  async getById(id: string): Promise<VectorChunk | undefined> {
    const db = await getDB()
    return db.get('chunks', id)
  }

  async getBySource(sourceId: string): Promise<VectorChunk[]> {
    const db = await getDB()
    return db.getAllFromIndex('chunks', 'by-source', sourceId)
  }

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('chunks', id)
  }

  async deleteBySource(sourceId: string): Promise<void> {
    const chunks = await this.getBySource(sourceId)
    const db = await getDB()
    const tx = db.transaction('chunks', 'readwrite')
    for (const chunk of chunks) {
      await tx.store.delete(chunk.id)
    }
    await tx.done
  }

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear('chunks')
  }

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('chunks')
  }

  async search(embedding: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const db = await getDB()
    let chunks = await db.getAll('chunks')

    if (options.sourceType) {
      chunks = chunks.filter((c) => c.sourceType === options.sourceType)
    }
    if (options.sourceId) {
      chunks = chunks.filter((c) => c.sourceId === options.sourceId)
    }

    const topK = options.topK ?? 5
    const minScore = options.minScore ?? 0

    const results: SearchResult[] = chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(embedding, chunk.embedding),
      }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return results
  }
}

export const chunkRepo = new ChunkRepository()
