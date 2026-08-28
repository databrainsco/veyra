import type { AppSettings } from '../types'
import { settingsRepo } from '../db/repositories/settingsRepository'
import {
  detectDeviceCapabilities,
  getEffectiveMemoryGB,
  getRecommendedModelId,
  isMobilePlatform,
  isModelCompatible,
} from './device'

export async function applyDeviceOptimizedSettings(): Promise<AppSettings> {
  const capabilities = await detectDeviceCapabilities()
  const settings = await settingsRepo.get()

  if (!isMobilePlatform(capabilities)) {
    return settings
  }

  const updates: Partial<AppSettings> = {}

  if (settings.ragEnabled) {
    updates.ragEnabled = false
  }
  if (settings.maxTokens > 256) {
    const memory = getEffectiveMemoryGB(capabilities)
    const maxAllowed = memory >= 8 ? 512 : memory >= 6 ? 384 : 256
    if (settings.maxTokens > maxAllowed) {
      updates.maxTokens = maxAllowed
    }
  }
  if (settings.ragTokenBudget > 400) {
    const memory = getEffectiveMemoryGB(capabilities)
    const maxRag = memory >= 8 ? 600 : memory >= 6 ? 500 : 400
    if (settings.ragTokenBudget > maxRag) {
      updates.ragTokenBudget = maxRag
    }
  }

  if (settings.activeModelId && !isModelCompatible(settings.activeModelId, capabilities).compatible) {
    updates.activeModelId = null
  }

  if (Object.keys(updates).length === 0) {
    return settings
  }

  return settingsRepo.update(updates)
}

export async function ensureMobileModelReady(): Promise<string | null> {
  const capabilities = await detectDeviceCapabilities()
  if (!isMobilePlatform(capabilities)) {
    return (await settingsRepo.get()).activeModelId
  }

  const settings = await applyDeviceOptimizedSettings()
  if (settings.activeModelId && isModelCompatible(settings.activeModelId, capabilities).compatible) {
    return settings.activeModelId
  }

  const recommendedId = getRecommendedModelId(capabilities)
  return recommendedId
}
