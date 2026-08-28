import type { AppSettings } from '../types'
import { settingsRepo } from '../db/repositories/settingsRepository'
import {
  detectDeviceCapabilities,
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
    updates.maxTokens = 256
  }
  if (settings.ragTokenBudget > 0) {
    updates.ragTokenBudget = 0
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
