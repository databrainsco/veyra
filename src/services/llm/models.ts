import type { ModelInfo } from '../../types'

export interface LLMCatalogEntry extends ModelInfo {
  downloadUrl?: string
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
  },
]

export function getModelInfo(modelId: string): LLMCatalogEntry | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId)
}
