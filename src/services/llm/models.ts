import type { ModelInfo } from '../../types'
import type { DeviceCapabilities } from '../../types'
import { isMobilePlatform } from '../../utils/device'

export interface LLMCatalogEntry extends ModelInfo {
  downloadUrl?: string
}

const TEXT_ONLY_LIMITS: ModelInfo['modalities'] = {
  supported: ['text', 'code'],
  notSupported: ['images', 'video', 'audio'],
}

const VISION_LIMITS: ModelInfo['modalities'] = {
  supported: ['text', 'code', 'images'],
  notSupported: ['video', 'audio'],
}

export const AVAILABLE_MODELS: LLMCatalogEntry[] = [
  // --- Móvil gama alta (S25 Ultra, flagships 8+ GB) ---
  {
    id: 'Qwen3.5-4B-q4f16_1-MLC',
    name: 'Qwen 3.5 4B',
    provider: 'Alibaba / MLC',
    sizeBytes: 2.5 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '8 GB RAM móvil', 'Solo móvil'],
    specialties: ['Chat avanzado', 'Razonamiento', 'Código', 'Resúmenes'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary:
      'El más potente para móvil en Veyra. Ideal para S25 Ultra y flagships con mucha RAM.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 8,
      mobileSupported: true,
      mobileOnly: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Qwen3.5-2B-q4f16_1-MLC',
    name: 'Qwen 3.5 2B',
    provider: 'Alibaba / MLC',
    sizeBytes: 1.4 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM móvil', 'Solo móvil'],
    specialties: ['Chat avanzado', 'Razonamiento', 'Multilingüe', 'Código'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary:
      'Recomendado para gama alta (p. ej. S25 Ultra). Mucho mejor que 0.5B en calidad de respuesta.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 6,
      mobileSupported: true,
      mobileOnly: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B Instruct',
    provider: 'Alibaba / MLC',
    sizeBytes: 1.9 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM móvil', 'Solo móvil'],
    specialties: ['Chat avanzado', 'Código', 'Resúmenes', 'Razonamiento'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Modelo potente para móviles con mucha RAM. Buen equilibrio calidad/velocidad.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 6,
      mobileSupported: true,
      mobileOnly: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 3.2 3B',
    provider: 'NousResearch / MLC',
    sizeBytes: 2.1 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM móvil', 'Solo móvil'],
    specialties: ['Chat natural', 'Instrucciones', 'Creatividad', 'Código'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Variante conversacional de Llama 3.2 3B optimizada para chat en móvil potente.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 6,
      mobileSupported: true,
      mobileOnly: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B',
    provider: 'Google / MLC',
    sizeBytes: 1.5 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM móvil', 'Solo móvil'],
    specialties: ['Chat', 'Redacción', 'Preguntas generales', 'Español'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Modelo de Google compacto con buena calidad en dispositivos móviles potentes.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 6,
      mobileSupported: true,
      mobileOnly: true,
      requiresWebGPU: true,
    },
  },
  // --- Móvil intermedio (4+ GB) ---
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B Instruct',
    provider: 'Alibaba / MLC',
    sizeBytes: 1.0 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '4 GB RAM móvil'],
    specialties: ['Chat', 'Multilingüe', 'Código básico', 'Explicaciones'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Salto claro de calidad respecto a 0.5B en móviles con 4 GB o más.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 4,
      mobileSupported: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B Instruct',
    provider: 'HuggingFace / MLC',
    sizeBytes: 1.1 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '4 GB RAM móvil'],
    specialties: ['Chat', 'Razonamiento ligero', 'Instrucciones', 'Código'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Modelo eficiente de ~1.7B parámetros, bueno en móviles de gama media-alta.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 4,
      mobileSupported: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    name: 'Gemma 3 1B',
    provider: 'Google / MLC',
    sizeBytes: 550 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '3 GB RAM móvil'],
    specialties: ['Chat', 'Respuestas claras', 'Multilingüe'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Ligero y capaz. Mejor que 0.5B sin exigir un flagship.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 3,
      mobileSupported: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Qwen3.5-0.8B-q4f16_1-MLC',
    name: 'Qwen 3.5 0.8B',
    provider: 'Alibaba / MLC',
    sizeBytes: 550 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '3 GB RAM móvil'],
    specialties: ['Chat', 'Respuestas rápidas', 'Multilingüe'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Sucesor ligero de Qwen 0.5B con mejor comprensión en el mismo rango de tamaño.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 3,
      mobileSupported: true,
      requiresWebGPU: true,
    },
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
    specialtySummary: 'El más ligero. Para móviles modestos o cuando priorizas velocidad.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 2,
      mobileSupported: true,
      requiresWebGPU: true,
    },
  },
  // --- Escritorio (también algunos en móvil 4 GB+) ---
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta / MLC',
    sizeBytes: 900 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '4 GB RAM'],
    specialties: ['Chat general', 'Redacción', 'Preguntas y respuestas', 'Código básico'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Conversación general y redacción ligera. También en móvil con 4 GB+.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 4,
      mobileSupported: true,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B Instruct',
    provider: 'Meta / MLC',
    sizeBytes: 2.1 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 8192,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM', 'Solo escritorio'],
    specialties: ['Chat avanzado', 'Redacción', 'Razonamiento', 'Código', 'Resúmenes'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Equilibrio entre calidad y capacidad. Bueno para tareas variadas y contexto largo.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 6,
      mobileSupported: false,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini Instruct',
    provider: 'Microsoft / MLC',
    sizeBytes: 2.3 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 4096,
    backend: 'webgpu',
    requirements: ['WebGPU', '6 GB RAM', 'Solo escritorio'],
    specialties: ['Código', 'Razonamiento', 'Matemáticas', 'Análisis técnico', 'Explicaciones'],
    modalities: TEXT_ONLY_LIMITS,
    specialtySummary: 'Orientado a programación, lógica y problemas técnicos.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 6,
      mobileSupported: false,
      requiresWebGPU: true,
    },
  },
  {
    id: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Vision',
    provider: 'Microsoft / MLC',
    sizeBytes: 2.4 * 1024 * 1024 * 1024,
    quantization: '4-bit',
    contextLength: 6144,
    backend: 'webgpu',
    requirements: ['WebGPU', '8 GB RAM', 'Solo imágenes', 'Solo escritorio'],
    specialties: ['Análisis de imágenes', 'Descripción visual', 'OCR', 'Preguntas sobre fotos'],
    modalities: VISION_LIMITS,
    specialtySummary: 'Entiende imágenes y responde sobre ellas. Requiere más memoria.',
    category: 'llm',
    deviceRequirements: {
      minMemoryGB: 8,
      mobileSupported: false,
      requiresWebGPU: true,
    },
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

export function getModelsForDevice(capabilities: DeviceCapabilities): LLMCatalogEntry[] {
  const isMobile = isMobilePlatform(capabilities)
  return AVAILABLE_MODELS.filter((model) => {
    if (model.deviceRequirements.mobileOnly && !isMobile) return false
    if (isMobile && !model.deviceRequirements.mobileSupported) return false
    return true
  })
}

export function isVisionModel(modelId: string): boolean {
  const info = getModelInfo(modelId)
  return info?.modalities.supported.includes('images') ?? false
}

export function modelSupportsImages(modelId: string | null): boolean {
  if (!modelId) return false
  return isVisionModel(modelId)
}
