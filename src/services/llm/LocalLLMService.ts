import { CreateMLCEngine, type MLCEngine, type ChatOptions } from '@mlc-ai/web-llm'
import type { ChatMessage, GenerationOptions, ModelInfo } from '../../types'
import type { LLMService } from './types'
import { getModelInfo, isVisionModel } from './models'
import { modelRepo } from '../../db/repositories/settingsRepository'
import {
  capOutputTokens,
  getContextWindowForModel,
  getGenerationProfile,
  getMaxInputTokens,
  getRecoveryProfile,
  truncateMessagesToBudget,
  type GenerationProfile,
} from '../../utils/generationProfile'

type WebLLMMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >

function toWebLLMContent(message: ChatMessage): WebLLMMessageContent {
  const images = message.metadata?.attachments?.filter((a) => a.type === 'image' && a.dataUrl) ?? []

  if (images.length === 0) {
    return message.content
  }

  const parts: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = []

  if (message.content.trim()) {
    parts.push({ type: 'text', text: message.content })
  }

  for (const image of images) {
    if (image.dataUrl) {
      parts.push({ type: 'image_url', image_url: { url: image.dataUrl } })
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: '¿Qué ves en esta imagen?' })
  }

  return parts
}

export class LocalLLMService implements LLMService {
  private engine: MLCEngine | null = null
  private currentModelId: string | null = null
  private abortController: AbortController | null = null
  private loadPromise: Promise<void> | null = null
  private activeGenerations = 0
  private generationGate: Promise<void> = Promise.resolve()
  private releaseGenerationGate: (() => void) | null = null
  private activeProfile: GenerationProfile | null = null

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

  private acquireGenerationGate(): void {
    if (this.activeGenerations === 0) {
      this.generationGate = new Promise<void>((resolve) => {
        this.releaseGenerationGate = resolve
      })
    }
    this.activeGenerations += 1
  }

  private releaseGeneration(): void {
    this.activeGenerations = Math.max(0, this.activeGenerations - 1)
    if (this.activeGenerations === 0) {
      this.releaseGenerationGate?.()
      this.releaseGenerationGate = null
    }
  }

  private async waitForGenerationToFinish(): Promise<void> {
    if (this.activeGenerations === 0) return

    this.abortController?.abort()
    if (this.engine) {
      try {
        await this.engine.interruptGenerate()
      } catch {
        // Engine may already be disposed.
      }
    }

    await this.generationGate
  }

  private messageHasImages(messages: ChatMessage[]): boolean {
    return messages.some((message) =>
      message.metadata?.attachments?.some((attachment) => attachment.type === 'image'),
    )
  }

  private async createEngine(
    modelId: string,
    onProgress?: (progress: number) => void,
    profileOverride?: GenerationProfile,
  ): Promise<MLCEngine> {
    const profile = profileOverride ?? (await getGenerationProfile())
    this.activeProfile = profile

    const hasImages = isVisionModel(modelId)
    const contextWindowSize = getContextWindowForModel(modelId, profile, hasImages)

    const chatOpts: ChatOptions = {
      context_window_size: contextWindowSize,
      max_history_size: Math.max(256, contextWindowSize - 128),
    }

    return CreateMLCEngine(
      modelId,
      {
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
      },
      chatOpts,
    )
  }

  private async loadModelInternal(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    await this.waitForGenerationToFinish()

    if (this.engine) {
      await this.unloadModelInternal()
    }

    await modelRepo.save({ modelId, status: 'loading' })

    try {
      const engine = await this.createEngine(modelId, onProgress)

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

  private async unloadModelInternal(): Promise<void> {
    if (!this.engine) return

    try {
      await this.engine.unload()
    } catch {
      // Engine may already be disposed.
    } finally {
      this.engine = null
      this.currentModelId = null
    }
  }

  async unloadModel(): Promise<void> {
    await this.waitForGenerationToFinish()

    if (this.loadPromise) {
      await this.loadPromise
    }

    await this.unloadModelInternal()
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

    this.acquireGenerationGate()
    try {
      const profile = this.activeProfile ?? (await getGenerationProfile())
      const hasImages = this.messageHasImages(messages)
      const contextWindow = getContextWindowForModel(this.currentModelId, profile, hasImages)
      const maxOutput = capOutputTokens(options?.maxTokens ?? profile.maxOutputTokens, profile)
      const maxInput = getMaxInputTokens(contextWindow, maxOutput)
      const preparedMessages = truncateMessagesToBudget(messages, maxInput)
      const generationOptions: GenerationOptions = {
        ...options,
        maxTokens: maxOutput,
      }

      try {
        yield* this.generateStream(preparedMessages, generationOptions)
      } catch (error) {
        if (this.isRecoverableGpuError(error) && this.currentModelId) {
          const modelId = this.currentModelId
          const recoveryProfile = getRecoveryProfile(profile)
          const recoveryOutput = capOutputTokens(
            generationOptions.maxTokens ?? recoveryProfile.maxOutputTokens,
            recoveryProfile,
          )
          const recoveryContext = getContextWindowForModel(modelId, recoveryProfile, hasImages)
          const recoveryInput = getMaxInputTokens(recoveryContext, recoveryOutput)
          const reducedMessages = truncateMessagesToBudget(preparedMessages, recoveryInput)

          await this.reinitializeEngine(modelId, recoveryProfile)
          yield* this.generateStream(reducedMessages, {
            ...generationOptions,
            maxTokens: recoveryOutput,
          })
          return
        }
        throw error
      }
    } finally {
      this.releaseGeneration()
    }
  }

  private async reinitializeEngine(
    modelId: string,
    profileOverride?: GenerationProfile,
  ): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.interruptGenerate()
      } catch {
        // Ignore interrupted or disposed engine.
      }
    }

    await this.unloadModelInternal()
    await new Promise((resolve) => setTimeout(resolve, 250))

    const engine = await this.createEngine(modelId, undefined, profileOverride)
    this.engine = engine
    this.currentModelId = modelId
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
      content: toWebLLMContent(m),
    }))

    const chunks = await this.engine.chat.completions.create({
      messages: chatMessages as Parameters<
        typeof this.engine.chat.completions.create
      >[0]['messages'],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: options?.topP ?? 0.95,
      stream: true,
    })

    try {
      for await (const chunk of chunks) {
        if (this.abortController?.signal.aborted) break
        const content = chunk.choices[0]?.delta?.content
        if (content) yield content
      }
    } finally {
      if (this.abortController?.signal.aborted && this.engine) {
        try {
          await this.engine.interruptGenerate()
        } catch {
          // Ignore interrupted or disposed engine.
        }
      }
    }
  }

  private isRecoverableGpuError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    const lower = message.toLowerCase()
    return (
      lower.includes('gpubuffer') ||
      lower.includes('mapasync') ||
      lower.includes('device lost') ||
      lower.includes('out of memory') ||
      lower.includes('oom') ||
      lower.includes('storage buffer') ||
      lower.includes('exceeded') ||
      lower.includes('webgpu')
    )
  }

  getModelInfo(): ModelInfo | null {
    if (!this.currentModelId) return null
    return getModelInfo(this.currentModelId) ?? null
  }

  async abort(): Promise<void> {
    this.abortController?.abort()
    if (this.engine) {
      try {
        await this.engine.interruptGenerate()
      } catch {
        // Engine may already be disposed.
      }
    }
  }
}

let llmInstance: LocalLLMService | null = null

export function getLLMService(): LocalLLMService {
  if (!llmInstance) {
    llmInstance = new LocalLLMService()
  }
  return llmInstance
}
