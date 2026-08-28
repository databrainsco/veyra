import type { VectorChunk, SearchOptions, SearchResult } from '../../types'
import { chunkRepo } from '../../db/repositories/chunkRepository'

export interface VectorStore {
  add(chunks: VectorChunk[]): Promise<void>
  search(embedding: number[], options?: SearchOptions): Promise<SearchResult[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  count(): Promise<number>
}

export class IndexedDBVectorStore implements VectorStore {
  async add(chunks: VectorChunk[]): Promise<void> {
    await chunkRepo.add(chunks)
  }

  async search(embedding: number[], options?: SearchOptions): Promise<SearchResult[]> {
    return chunkRepo.search(embedding, options)
  }

  async delete(id: string): Promise<void> {
    await chunkRepo.delete(id)
  }

  async clear(): Promise<void> {
    await chunkRepo.clear()
  }

  async count(): Promise<number> {
    return chunkRepo.count()
  }
}

export const vectorStore = new IndexedDBVectorStore()
