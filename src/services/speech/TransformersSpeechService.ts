import { pipeline, env } from '@xenova/transformers'
import { getSpeechModelInfo } from './speechModels'
import { modelRepo } from '../../db/repositories/settingsRepository'

env.allowLocalModels = false
env.useBrowserCache = true
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1
}

type TranscriberPipeline = (
  audio: string,
  options?: Record<string, unknown>,
) => Promise<{ text: string } | string>

export class TransformersSpeechService {
  private transcriber: TranscriberPipeline | null = null
  private currentModelId: string | null = null
  private loadPromise: Promise<void> | null = null

  async loadModel(
    modelId: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.transcriber && this.currentModelId === modelId) return

    if (this.loadPromise) {
      await this.loadPromise
      if (this.transcriber && this.currentModelId === modelId) return
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
    const info = getSpeechModelInfo(modelId)
    if (!info) throw new Error('MODEL_NOT_SUPPORTED: Modelo de audio no encontrado')

    if (this.transcriber && this.currentModelId !== modelId) {
      await this.unload()
    }

    await modelRepo.save({ modelId, status: 'loading' })

    try {
      const transcriber = (await pipeline('automatic-speech-recognition', info.huggingFaceId, {
        quantized: true,
        progress_callback: (data: { progress?: number }) => {
          const progress = (data.progress ?? 0) / 100
          onProgress?.(progress)
          void modelRepo.save({
            modelId,
            status: 'downloading',
            downloadProgress: progress,
            downloadedBytes: Math.floor(progress * info.sizeBytes),
            totalBytes: info.sizeBytes,
          })
        },
      })) as TranscriberPipeline

      this.transcriber = transcriber
      this.currentModelId = modelId

      await modelRepo.save({
        modelId,
        status: 'installed',
        installedAt: Date.now(),
        downloadProgress: 1,
      })
    } catch (error) {
      this.transcriber = null
      this.currentModelId = null
      await modelRepo.save({
        modelId,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Error al cargar modelo de audio',
      })
      throw error
    }
  }

  async transcribe(file: File, language = 'spanish'): Promise<string> {
    if (!this.transcriber) {
      throw new Error('SPEECH_MODEL_NOT_LOADED: No hay modelo de audio cargado')
    }

    const url = URL.createObjectURL(file)
    try {
      const result = await this.transcriber(url, {
        language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      })
      if (typeof result === 'string') return result.trim()
      return result.text.trim()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  isLoaded(): boolean {
    return this.transcriber !== null
  }

  getActiveModelId(): string | null {
    return this.currentModelId
  }

  async unload(): Promise<void> {
    this.transcriber = null
    this.currentModelId = null
  }
}

let speechInstance: TransformersSpeechService | null = null

export function getSpeechService(): TransformersSpeechService {
  if (!speechInstance) {
    speechInstance = new TransformersSpeechService()
  }
  return speechInstance
}
