import type { ChatMessage, GenerationOptions, ModelInfo } from '../../types'

export interface LLMService {
  initialize(): Promise<void>
  loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void>
  unloadModel(): Promise<void>
  isLoaded(): boolean
  generate(
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): AsyncIterable<string>
  getModelInfo(): ModelInfo | null
  abort(): Promise<void>
}
