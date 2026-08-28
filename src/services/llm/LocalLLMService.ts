import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm'
import type { ChatMessage, GenerationOptions, ModelInfo } from '../../types'
import type { LLMService } from './types'
import { getModelInfo } from './models'
import { modelRepo } from '../../db/repositories/settingsRepository'

export class LocalLLMService implements LLMService {
  private engine: MLCEngine | null = null
  private currentModelId: string | null = null
  private abortController: AbortController | null = null
  private loadPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    // Lazy init on loadModel
  }

  async loadModel(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    return this.ensureModelLoaded(modelId, onProgress)
  }

  async ensureModelLoaded(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.engine && this.currentModelId === modelId) return

    if (this.loadPromise) {
      await this.loadPromise
      if (this.engine && this.currentModelId === modelId) return
    }

    this.loadPromise = this.loadModelInternal(modelId, onProgress)
    try {
      await this.loadPromise
    } finally {
      this.loadPromise = null
    }
  }

  private async loadModelInternal(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.engine) {
      await this.unloadModel()
    }

    await modelRepo.save({ modelId, status: 'loading' })

    try {
      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          const progress = report.progress ?? 0
          onProgress?.(progress)
          void modelRepo.save({
            modelId,
            status: 'downloading',
            downloadProgress: progress,
            downloadedBytes: Math.floor(progress * (getModelInfo(modelId)?.sizeBytes ?? 0)),
            totalBytes: getModelInfo(modelId)?.sizeBytes,
          })
        },
      })

      this.engine = engine
      this.currentModelId = modelId

      await modelRepo.save({
        modelId,
        status: 'active',
        installedAt: Date.now(),
        downloadProgress: 1,
      })
    } catch (error) {
      this.engine = null
      this.currentModelId = null
      await modelRepo.save({
        modelId,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Error al cargar el modelo',
      })
      throw error
    }
  }

  async unloadModel(): Promise<void> {
    if (this.engine) {
      await this.engine.unload()
      this.engine = null
      this.currentModelId = null
    }
  }

  isLoaded(): boolean {
    return this.engine !== null && this.currentModelId !== null
  }

  getActiveModelId(): string | null {
    return this.currentModelId
  }

  async *generate(
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): AsyncIterable<string> {
    if (!this.engine || !this.currentModelId) {
      throw new Error('MODEL_NOT_LOADED: El modelo no está cargado')
    }

    try {
      yield* this.generateStream(messages, options)
    } catch (error) {
      if (this.isRecoverableGpuError(error) && this.currentModelId) {
        const modelId = this.currentModelId
        await this.unloadModel()
        await this.ensureModelLoaded(modelId)
        yield* this.generateStream(messages, options)
        return
      }
      throw error
    }
  }

  private async *generateStream(
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): AsyncIterable<string> {
    if (!this.engine) {
      throw new Error('MODEL_NOT_LOADED: El modelo no está cargado')
    }

    this.abortController = new AbortController()

    const chatMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))

    const chunks = await this.engine.chat.completions.create({
      messages: chatMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: options?.topP ?? 0.95,
      stream: true,
    })

    for await (const chunk of chunks) {
      if (this.abortController?.signal.aborted) break
      const content = chunk.choices[0]?.delta?.content
      if (content) yield content
    }
  }

  private isRecoverableGpuError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    const lower = message.toLowerCase()
    return (
      lower.includes('gpubuffer') ||
      lower.includes('mapasync') ||
      lower.includes('device lost')
    )
  }

  getModelInfo(): ModelInfo | null {
    if (!this.currentModelId) return null
    return getModelInfo(this.currentModelId) ?? null
  }

  abort(): void {
    this.abortController?.abort()
  }
}

let llmInstance: LocalLLMService | null = null

export function getLLMService(): LocalLLMService {
  if (!llmInstance) {
    llmInstance = new LocalLLMService()
  }
  return llmInstance
}
