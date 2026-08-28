import type { ChatMessage } from '../types'
import type { DeviceCapabilities } from '../types'
import { detectDeviceCapabilities } from './device'
import { estimateTokens } from './helpers'

export interface GenerationProfile {
  contextWindowSize: number
  maxOutputTokens: number
  maxRagTokens: number
  maxRecentMessages: number
}

let cachedCapabilities: DeviceCapabilities | null = null
let cachedProfile: GenerationProfile | null = null

export function computeGenerationProfile(capabilities: DeviceCapabilities): GenerationProfile {
  const isMobile = capabilities.platform === 'iOS' || capabilities.platform === 'Android'
  const memory = capabilities.estimatedMemoryGB ?? 4

  if (isMobile || memory < 4) {
    return {
      contextWindowSize: 2048,
      maxOutputTokens: 512,
      maxRagTokens: 600,
      maxRecentMessages: 4,
    }
  }

  if (memory < 6) {
    return {
      contextWindowSize: 3072,
      maxOutputTokens: 1024,
      maxRagTokens: 1200,
      maxRecentMessages: 6,
    }
  }

  return {
    contextWindowSize: 4096,
    maxOutputTokens: 2048,
    maxRagTokens: 2500,
    maxRecentMessages: 10,
  }
}

export function getRecoveryProfile(profile: GenerationProfile): GenerationProfile {
  return {
    contextWindowSize: Math.max(1024, Math.floor(profile.contextWindowSize / 2)),
    maxOutputTokens: Math.max(256, Math.floor(profile.maxOutputTokens / 2)),
    maxRagTokens: Math.max(300, Math.floor(profile.maxRagTokens / 2)),
    maxRecentMessages: Math.max(2, Math.floor(profile.maxRecentMessages / 2)),
  }
}

export async function getGenerationProfile(): Promise<GenerationProfile> {
  if (!cachedProfile) {
    cachedCapabilities = await detectDeviceCapabilities()
    cachedProfile = computeGenerationProfile(cachedCapabilities)
  }
  return cachedProfile
}

export function getContextWindowForModel(
  modelId: string,
  profile: GenerationProfile,
  hasImages = false,
): number {
  const isVision = modelId.includes('vision')

  if (isVision) {
    if (hasImages) {
      return Math.min(3072, profile.contextWindowSize)
    }
    return Math.min(4096, profile.contextWindowSize * 2)
  }

  return profile.contextWindowSize
}

export function capOutputTokens(requested: number, profile: GenerationProfile): number {
  return Math.min(requested, profile.maxOutputTokens)
}

export function truncateMessagesToBudget(
  messages: ChatMessage[],
  maxInputTokens: number,
): ChatMessage[] {
  if (messages.length === 0) return messages

  const systemMessages = messages.filter((m) => m.role === 'system')
  const conversationMessages = messages.filter((m) => m.role !== 'system')

  const systemTokens = systemMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  let budget = Math.max(256, maxInputTokens - systemTokens)

  const kept: ChatMessage[] = []
  for (let i = conversationMessages.length - 1; i >= 0; i -= 1) {
    const message = conversationMessages[i]!
    const tokens = estimateTokens(message.content)
    if (tokens > budget && kept.length > 0) break
    if (tokens > budget) {
      kept.unshift({
        ...message,
        content: message.content.slice(0, budget * 4),
      })
      break
    }
    budget -= tokens
    kept.unshift(message)
  }

  return [...systemMessages, ...kept]
}

export function getMaxInputTokens(
  contextWindowSize: number,
  maxOutputTokens: number,
): number {
  return Math.max(512, contextWindowSize - maxOutputTokens - 256)
}
