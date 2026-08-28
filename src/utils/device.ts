import type { DeviceCapabilities } from '../types'
import { getModelInfo, getModelsForDevice } from '../services/llm/models'

export interface ModelCompatibility {
  compatible: boolean
  reason?: string
}

export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  let webgpu = false
  try {
    if ('gpu' in navigator) {
      const adapter = await navigator.gpu.requestAdapter()
      webgpu = adapter !== null
    }
  } catch {
    webgpu = false
  }

  const ua = navigator.userAgent
  let platform = 'unknown'
  let browser = 'unknown'

  if (/iPhone|iPad|iPod/.test(ua)) platform = 'iOS'
  else if (/Android/.test(ua)) platform = 'Android'
  else if (/Mac/.test(ua)) platform = 'macOS'
  else if (/Win/.test(ua)) platform = 'Windows'
  else if (/Linux/.test(ua)) platform = 'Linux'

  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome'
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/Firefox/.test(ua)) browser = 'Firefox'
  else if (/Edg/.test(ua)) browser = 'Edge'

  let estimatedMemoryGB: number | null = null
  if ('deviceMemory' in navigator) {
    estimatedMemoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
  }

  let storageQuota: number | null = null
  let storageUsage: number | null = null
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate()
    storageQuota = estimate.quota ?? null
    storageUsage = estimate.usage ?? null
  }

  return {
    webgpu,
    platform,
    browser,
    estimatedMemoryGB,
    storageQuota,
    storageUsage,
  }
}

export function isMobilePlatform(capabilities: DeviceCapabilities): boolean {
  return capabilities.platform === 'iOS' || capabilities.platform === 'Android'
}

export function getEffectiveMemoryGB(capabilities: DeviceCapabilities): number {
  if (capabilities.estimatedMemoryGB != null) {
    return capabilities.estimatedMemoryGB
  }
  return isMobilePlatform(capabilities) ? 2 : 4
}

export function getRecommendedModelId(capabilities: DeviceCapabilities): string {
  const isMobile = isMobilePlatform(capabilities)
  const memory = getEffectiveMemoryGB(capabilities)

  if (isMobile) {
    if (memory >= 8) return 'Qwen3.5-4B-q4f16_1-MLC'
    if (memory >= 6) return 'Qwen3.5-2B-q4f16_1-MLC'
    if (memory >= 4) return 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
    if (memory >= 3) return 'Qwen3.5-0.8B-q4f16_1-MLC'
    return 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
  }

  if (memory < 4) {
    return 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
  }
  if (capabilities.webgpu && memory >= 6) {
    return 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
  }
  if (capabilities.webgpu) {
    return 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
  }
  return 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
}

export function isModelCompatible(
  modelId: string,
  capabilities: DeviceCapabilities,
): ModelCompatibility {
  const model = getModelInfo(modelId)
  if (!model) {
    return { compatible: false, reason: 'Modelo no encontrado.' }
  }

  const { deviceRequirements } = model
  const isMobile = isMobilePlatform(capabilities)
  const memory = getEffectiveMemoryGB(capabilities)

  if (!isMobile && model.deviceRequirements.mobileOnly) {
    return {
      compatible: false,
      reason: `${model.name} solo está disponible en móvil.`,
    }
  }

  if (isMobile && !deviceRequirements.mobileSupported) {
    return {
      compatible: false,
      reason: `${model.name} es solo para escritorio. En móvil usa un modelo de la sección compatible.`,
    }
  }

  if (deviceRequirements.requiresWebGPU && !capabilities.webgpu) {
    return {
      compatible: false,
      reason: `${model.name} requiere WebGPU. Usa Chrome actualizado en un dispositivo compatible.`,
    }
  }

  if (memory < deviceRequirements.minMemoryGB) {
    return {
      compatible: false,
      reason: `${model.name} requiere al menos ${deviceRequirements.minMemoryGB} GB de RAM (tu dispositivo: ~${memory} GB).`,
    }
  }

  if (
    model.sizeBytes > 1.5 * 1024 * 1024 * 1024 &&
    memory < deviceRequirements.minMemoryGB + 1
  ) {
    return {
      compatible: false,
      reason: `${model.name} es demasiado pesado para la RAM disponible en tu dispositivo.`,
    }
  }

  return { compatible: true }
}

export function getCompatibleLlmModelIds(capabilities: DeviceCapabilities): string[] {
  return getModelsForDevice(capabilities)
    .filter((model) => isModelCompatible(model.id, capabilities).compatible)
    .map((model) => model.id)
}

export interface DeviceCompatibilityTier {
  deviceLabel: string
  requirements: string
  llmModels: string[]
}

export const DEVICE_COMPATIBILITY_TIERS: DeviceCompatibilityTier[] = [
  {
    deviceLabel: 'Móvil básico (2–3 GB)',
    requirements: 'WebGPU, Chrome en Android/iOS',
    llmModels: ['Qwen 2.5 0.5B', 'Qwen 3.5 0.8B', 'Gemma 3 1B'],
  },
  {
    deviceLabel: 'Móvil intermedio (4 GB)',
    requirements: 'WebGPU, 4 GB RAM reportada',
    llmModels: ['Qwen 2.5 1.5B', 'SmolLM2 1.7B', 'Llama 3.2 1B'],
  },
  {
    deviceLabel: 'Móvil gama alta (6–8 GB, ej. S25 Ultra)',
    requirements: 'WebGPU, 6–8 GB RAM reportada',
    llmModels: ['Qwen 3.5 4B', 'Qwen 3.5 2B', 'Qwen 2.5 3B', 'Hermes 3 3B', 'Gemma 2 2B'],
  },
  {
    deviceLabel: 'PC / Mac (4 GB RAM)',
    requirements: 'WebGPU, 4 GB RAM',
    llmModels: ['Qwen 2.5 0.5B', 'Llama 3.2 1B'],
  },
  {
    deviceLabel: 'PC / Mac (6 GB+ RAM)',
    requirements: 'WebGPU, 6 GB RAM',
    llmModels: ['Llama 3.2 3B', 'Phi 3.5 Mini'],
  },
  {
    deviceLabel: 'PC / Mac (8 GB+ RAM)',
    requirements: 'WebGPU, 8 GB RAM, escritorio',
    llmModels: ['Phi 3.5 Vision'],
  },
]

export function partitionByCompatibility<T extends { id: string }>(
  models: T[],
  capabilities: DeviceCapabilities,
): { compatible: T[]; incompatible: T[] } {
  const compatible: T[] = []
  const incompatible: T[] = []

  for (const model of models) {
    if (isModelCompatible(model.id, capabilities).compatible) {
      compatible.push(model)
    } else {
      incompatible.push(model)
    }
  }

  return { compatible, incompatible }
}
