export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Solo se admiten archivos de imagen (JPEG, PNG, WebP, GIF).'
  }
  if (file.size > 4 * 1024 * 1024) {
    return 'La imagen no puede superar 4 MB.'
  }
  return null
}
