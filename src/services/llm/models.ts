import type { ModelInfo } from '../../types'

export interface LLMCatalogEntry extends ModelInfo {
  downloadUrl?: string
}

const TEXT_ONLY_LIMITS: ModelInfo['modalities'] = {
  supported: ['text', 'code'],
  notSupported: ['images', 'video', 'audio'],
}

export const AVAILABLE_MODELS: LLMCatalogEntry[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta / MLC',
    sizeBytes: 900 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '2 GB RAM mínimo'],
    specialties: ['Chat general', 'Redacción', 'Preguntas y respuestas', 'Código básico'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Conversación general y redacción ligera. Ideal para dispositivos con poca RAM.',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B Instruct',
    provider: 'Meta / MLC',
    sizeBytes: 2.1 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 8192,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM recomendado'],
    specialties: ['Chat avanzado', 'Redacción', 'Razonamiento', 'Código', 'Resúmenes'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Equilibrio entre calidad y capacidad. Bueno para tareas variadas y contexto largo.',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini Instruct',
    provider: 'Microsoft / MLC',
    sizeBytes: 2.3 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '4 GB RAM mínimo'],
    specialties: ['Código', 'Razonamiento', 'Matemáticas', 'Análisis técnico', 'Explicaciones'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Orientado a programación, lógica y problemas técnicos.',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct',
    provider: 'Alibaba / MLC',
    sizeBytes: 400 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '1.5 GB RAM mínimo'],
    specialties: ['Chat rápido', 'Redacción corta', 'Multilingüe', 'Respuestas breves'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'El más ligero. Mejor para móviles y respuestas rápidas en texto.',
  },
]

export const MODALITY_LABELS: Record<string, string> = {
  text: 'Texto',
  code: 'Código',
  images: 'Imágenes',
  video: 'Video',
  audio: 'Audio',
}

export function getModelInfo(modelId: string): LLMCatalogEntry | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId)
}
