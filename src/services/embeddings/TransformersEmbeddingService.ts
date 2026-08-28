import { pipeline, env } from '@xenova/transformers'
import type { EmbeddingService } from './types'

env.allowLocalModels = false
env.useBrowserCache = true

type FeatureExtractionPipeline = (
  text: string,
  options?: Record<string, unknown>,
) => Promise<{ data: Float32Array | number[] }>

export class TransformersEmbeddingService implements EmbeddingService {
  private extractor: FeatureExtractionPipeline | null = null
  private modelId: string
  private ready = false

  constructor(modelId = 'Xenova/all-MiniLM-L6-v2') {
    this.modelId = modelId
  }

  async initialize(): Promise<void> {
    if (this.ready) return
    this.extractor = (await pipeline('feature-extraction', this.modelId, {
      quantized: true,
    })) as FeatureExtractionPipeline
    this.ready = true
  }

  async embed(text: string): Promise<number[]> {
    await this.initialize()
    if (!this.extractor) throw new Error('EMBEDDING_FAILED: Modelo no inicializado')

    const output = await this.extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    const batchSize = 8

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const embeddings = await Promise.all(batch.map((t) => this.embed(t)))
      results.push(...embeddings)
    }

    return results
  }

  getModelId(): string {
    return this.modelId
  }

  isReady(): boolean {
    return this.ready
  }
}

let embeddingInstance: TransformersEmbeddingService | null = null

export function getEmbeddingService(modelId?: string): TransformersEmbeddingService {
  if (!embeddingInstance || (modelId && embeddingInstance.getModelId() !== modelId)) {
    embeddingInstance = new TransformersEmbeddingService(modelId)
  }
  return embeddingInstance
}
