import type { DeviceCapabilities } from '../types'
import { getModelInfo, AVAILABLE_MODELS } from '../services/llm/models'
import { getSpeechModelInfo } from '../services/speech/speechModels'

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

  if (isMobile || memory < 4) {
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

export function getRecommendedSpeechModelId(): string {
  return 'whisper-tiny'
}

function getCatalogModel(modelId: string) {
  return getModelInfo(modelId) ?? getSpeechModelInfo(modelId)
}

export function isModelCompatible(
  modelId: string,
  capabilities: DeviceCapabilities,
): ModelCompatibility {
  const model = getCatalogModel(modelId)
  if (!model) {
    return { compatible: false, reason: 'Modelo no encontrado.' }
  }

  const { deviceRequirements } = model
  const isMobile = isMobilePlatform(capabilities)
  const memory = getEffectiveMemoryGB(capabilities)

  if (deviceRequirements.requiresWebGPU && !capabilities.webgpu) {
    return {
      compatible: false,
      reason: `${model.name} requiere WebGPU. Usa Chrome actualizado en un dispositivo compatible.`,
    }
  }

  if (isMobile && !deviceRequirements.mobileSupported) {
    return {
      compatible: false,
      reason: `${model.name} no está disponible en móvil. En este dispositivo usa Qwen 2.5 0.5B.`,
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

export function isSpeechCompatible(
  modelId: string,
  capabilities: DeviceCapabilities | null,
): ModelCompatibility {
  if (!capabilities) {
    return { compatible: false, reason: 'Comprobando compatibilidad del dispositivo...' }
  }
  return isModelCompatible(modelId, capabilities)
}

export function getCompatibleLlmModelIds(capabilities: DeviceCapabilities): string[] {
  return AVAILABLE_MODELS.filter((model) => isModelCompatible(model.id, capabilities).compatible).map(
    (model) => model.id,
  )
}
