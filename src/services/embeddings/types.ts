export interface EmbeddingService {
  initialize(): Promise<void>
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getModelId(): string
  isReady(): boolean
}
