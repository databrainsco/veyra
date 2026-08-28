import * as webllm from '@mlc-ai/web-llm'
import type { ChatMessage, GenerationOptions, ModelInfo } from '../../types'
import type { LLMService } from './types'
import { getModelInfo } from './models'
import { modelRepo } from '../../db/repositories/settingsRepository'

export class LocalLLMService implements LLMService {
  private engine: webllm.MLCEngine | null = null
  private currentModelId: string | null = null
  private abortController: AbortController | null = null

  async initialize(): Promise<void> {
    // WebLLM initializes lazily on loadModel
  }

  async loadModel(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.engine && this.currentModelId === modelId) return

    if (this.engine) {
      await this.unloadModel()
    }

    await modelRepo.save({
      modelId,
      status: 'loading',
    })

    try {
      const engine = new webllm.MLCEngine()
      engine.setInitProgressCallback((report) => {
        const progress = report.progress ?? 0
        onProgress?.(progress)
        modelRepo.save({
          modelId,
          status: 'downloading',
          downloadProgress: progress,
          downloadedBytes: Math.floor(progress * (getModelInfo(modelId)?.sizeBytes ?? 0)),
          totalBytes: getModelInfo(modelId)?.sizeBytes,
        })
      })

      await engine.reload(modelId)
      this.engine = engine
      this.currentModelId = modelId

      await modelRepo.save({
        modelId,
        status: 'active',
        installedAt: Date.now(),
        downloadProgress: 1,
      })
    } catch (error) {
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
    return this.engine !== null
  }

  async *generate(
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): AsyncIterable<string> {
    if (!this.engine) {
      throw new Error('MODEL_LOAD_FAILED: No hay modelo cargado')
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
