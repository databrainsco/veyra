export function formatUserError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('model not loaded') || lower.includes('reload(model)')) {
    return 'El modelo de IA no está cargado. Ve a Modelos y actívalo, o espera a que termine de cargar.'
  }

  if (lower.includes('gpubuffer') || lower.includes('mapasync') || lower.includes('device lost')) {
    return 'Error de GPU al generar la respuesta. Cierra otras pestañas, recarga la página e intenta de nuevo. En móvil, prueba un modelo más pequeño (Qwen 0.5B).'
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
