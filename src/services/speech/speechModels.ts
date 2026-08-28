import type { ModelInfo } from '../../types'

export interface SpeechCatalogEntry extends Omit<ModelInfo, 'quantization' | 'contextLength'> {
  huggingFaceId: string
  quantization: 'quantized'
  contextLength: 0
}

const AUDIO_LIMITS: ModelInfo['modalities'] = {
  supported: ['audio', 'text'],
  notSupported: ['images', 'video', 'code'],
}

export const AVAILABLE_SPEECH_MODELS: SpeechCatalogEntry[] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    provider: 'OpenAI / Xenova',
    huggingFaceId: 'Xenova/whisper-tiny',
    sizeBytes: 39 * 1024 * 1024,
    quantization: 'quantized',
    contextLength: 0,
    backend: 'wasm',
    requirements: ['~75 MB descarga', 'Funciona en móvil'],
    specialties: ['Voz a texto', 'Transcripción', 'Notas de voz', 'Español e inglés'],
    modalities: AUDIO_LIMITS,
    specialtySummary: 'El más ligero. Transcribe audio a texto localmente. Ideal para móvil.',
    category: 'speech',
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    provider: 'OpenAI / Xenova',
    huggingFaceId: 'Xenova/whisper-base',
    sizeBytes: 74 * 1024 * 1024,
    quantization: 'quantized',
    contextLength: 0,
    backend: 'wasm',
    requirements: ['~150 MB descarga', 'Mejor precisión que Tiny'],
    specialties: ['Voz a texto', 'Transcripción precisa', 'Entrevistas', 'Dictado'],
    modalities: AUDIO_LIMITS,
    specialtySummary: 'Mayor precisión en transcripción. Recomendado si tienes espacio.',
    category: 'speech',
  },
]

export function getSpeechModelInfo(modelId: string): SpeechCatalogEntry | undefined {
  return AVAILABLE_SPEECH_MODELS.find((m) => m.id === modelId)
}

export function isSpeechModelId(modelId: string): boolean {
  return AVAILABLE_SPEECH_MODELS.some((m) => m.id === modelId)
}
