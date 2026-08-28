export function generateId(): string {
  return crypto.randomUUID()
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours} h`
  if (days < 7) return `Hace ${days} días`
  return new Date(timestamp).toLocaleDateString('es')
}

export function groupByDate<T extends { updatedAt?: number; createdAt: number }>(
  items: T[],
  getTimestamp: (item: T) => number = (item) => item.updatedAt ?? item.createdAt,
): Record<string, T[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const weekAgo = today - 7 * 86400000

  const groups: Record<string, T[]> = {
    Hoy: [],
    Ayer: [],
    'Esta semana': [],
    Anterior: [],
  }

  for (const item of items) {
    const ts = getTimestamp(item)
    if (ts >= today) groups['Hoy']!.push(item)
    else if (ts >= yesterday) groups['Ayer']!.push(item)
    else if (ts >= weekAgo) groups['Esta semana']!.push(item)
    else groups['Anterior']!.push(item)
  }

  return groups
}

export async function hashFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\sáéíóúñÁÉÍÓÚÑ]/g, '_').slice(0, 255)
}
