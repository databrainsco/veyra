import type { DeviceCapabilities } from '../types'

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

export function getRecommendedModelId(capabilities: DeviceCapabilities): string {
  const isMobile = capabilities.platform === 'iOS' || capabilities.platform === 'Android'
  const memory = capabilities.estimatedMemoryGB ?? 4

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

export function isModelCompatible(
  modelId: string,
  capabilities: DeviceCapabilities,
): { compatible: boolean; reason?: string } {
  const largeModels = ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC']
  const isLarge = largeModels.includes(modelId)

  if (!capabilities.webgpu) {
    return {
      compatible: false,
      reason: 'WebGPU no está disponible en este dispositivo. Se requiere un navegador compatible con WebGPU.',
    }
  }

  if (isLarge && (capabilities.estimatedMemoryGB ?? 4) < 6) {
    return {
      compatible: false,
      reason: 'Este modelo requiere al menos 6 GB de memoria. Prueba con un modelo más pequeño.',
    }
  }

  return { compatible: true }
}
