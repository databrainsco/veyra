export interface ChunkOptions {
  chunkSize: number
  overlap: number
}

export function chunkText(text: string, options: ChunkOptions): string[] {
  const { chunkSize, overlap } = options
  const overlapTokens = Math.floor(chunkSize * overlap)

  const words = text.split(/\s+/)
  const chunks: string[] = []

  let currentWords: string[] = []
  let currentTokenEstimate = 0

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4) + 1
    if (currentTokenEstimate + wordTokens > chunkSize && currentWords.length > 0) {
      chunks.push(currentWords.join(' '))
      const overlapWordCount = Math.ceil(overlapTokens)
      currentWords = currentWords.slice(-overlapWordCount)
      currentTokenEstimate = currentWords.reduce((sum, w) => sum + Math.ceil(w.length / 4) + 1, 0)
    }
    currentWords.push(word)
    currentTokenEstimate += wordTokens
  }

  if (currentWords.length > 0) {
    chunks.push(currentWords.join(' '))
  }

  return chunks.filter((c) => c.trim().length > 0)
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}
