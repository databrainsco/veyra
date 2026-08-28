export function formatUserError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('model not loaded') || lower.includes('reload(model)')) {
    return 'El modelo de IA no está cargado. Ve a Modelos y actívalo, o espera a que termine de cargar.'
  }

  if (lower.includes('tokenizer') && lower.includes('already deleted')) {
    return 'El modelo se descargó mientras generaba una respuesta. Espera a que termine o pulsa Detener antes de cambiar de modelo. Recarga la página si el error persiste.'
  }

  if (lower.includes('gpubuffer') || lower.includes('mapasync') || lower.includes('device lost')) {
    return 'Error de GPU al generar la respuesta. Cierra otras pestañas, recarga la página e intenta de nuevo. En móvil usa Qwen 0.5B y desactiva RAG en Ajustes si sigue fallando.'
  }

  if (lower.includes('storage buffer') || lower.includes('exceeded the maximum')) {
    return 'El contexto es demasiado grande para tu GPU. Prueba con Qwen 0.5B, reduce el historial o desactiva la memoria RAG en Ajustes.'
  }

  if (lower.includes('webgpu')) {
    return 'WebGPU no está disponible o falló. Usa Chrome actualizado o ve a Modelos para ver compatibilidad.'
  }

  if (lower.includes('out of memory') || lower.includes('oom')) {
    return 'Memoria insuficiente para este modelo. Prueba con un modelo más pequeño en la sección Modelos.'
  }

  return message
}

export function isGpuError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  return (
    lower.includes('gpubuffer') ||
    lower.includes('mapasync') ||
    lower.includes('device lost') ||
    lower.includes('webgpu')
  )
}
