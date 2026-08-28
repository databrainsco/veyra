import type { AppSettings, DeviceCapabilities } from '../../types'
import { computeGenerationProfile } from '../../utils/generationProfile'
import { isMobilePlatform } from '../../utils/device'

export interface RagGuideSection {
  title: string
  items: string[]
}

export interface RagGuide {
  overview: string
  whatToIndex: RagGuideSection
  questionExamples: RagGuideSection
  helpsWith: RagGuideSection
  limitations: RagGuideSection
  tips: RagGuideSection
}

export const RAG_GUIDE: RagGuide = {
  overview:
    'RAG (Retrieval-Augmented Generation) permite que Veyra busque en tu memoria local — conversaciones pasadas y documentos — fragmentos relevantes y los use como contexto al responder en el chat. Cada conversación también indexa su propio historial automáticamente, así el modelo recuerda lo que ya preguntaste en ese chat.',
  whatToIndex: {
    title: 'Qué puedes indexar (ejemplos)',
    items: [
      'PDF: manuales, apuntes, contratos, informes, artículos, libros escaneados con texto seleccionable',
      'TXT: notas, listas, exportaciones de chat, código en texto plano, logs',
      'Conversaciones: se indexan solas en escritorio unos segundos después de chatear',
      'Biblioteca: sube archivos desde la sección Biblioteca (PDF o TXT)',
      'Memoria semántica: pregunta en lenguaje natural, no hace falta recordar el nombre exacto del archivo',
    ],
  },
  questionExamples: {
    title: 'Ejemplos de preguntas que funcionan bien',
    items: [
      '«¿Qué dijimos la semana pasada sobre el presupuesto del proyecto?»',
      '«Resume el documento de políticas de vacaciones que subí»',
      '«Según mis apuntes de React, ¿cómo funciona useEffect?»',
      '«¿En qué página del PDF habla de garantías?»',
      '«Compara lo que acordamos en el chat con lo que dice el contrato»',
      '«Lista los puntos clave del informe técnico en Biblioteca»',
    ],
  },
  helpsWith: {
    title: 'Hasta dónde te puede ayudar',
    items: [
      'Recuperar lo que ya dijiste en el mismo chat (memoria del hilo)',
      'Recuperar información de tus propios datos sin buscar manualmente',
      'Responder con base en documentos largos que no caben en un solo mensaje',
      'Recordar detalles de conversaciones antiguas (fechas, decisiones, nombres)',
      'Citar fragmentos relevantes y mostrar fuentes bajo la respuesta del chat',
      'Consultas en español sobre contenido en español o inglés indexado',
      'Privacidad: tus archivos no salen del dispositivo',
    ],
  },
  limitations: {
    title: 'Qué no hace / limitaciones',
    items: [
      'En móvil: memoria del chat activo (sin documentos ni otras conversaciones)',
      'No sustituye Google ni bases de datos en vivo (CVEs, noticias, precios actuales)',
      'Solo PDF y TXT en Biblioteca; no Word, Excel ni imágenes sueltas',
      'PDFs escaneados sin capa de texto (solo imagen) no se leen bien',
      'La calidad depende del modelo de chat activo y del tamaño del contexto',
      'Si el fragmento no está indexado o la pregunta es muy vaga, puede no encontrar nada útil',
      'No ejecuta código ni valida automáticamente vulnerabilidades en tus archivos',
    ],
  },
  tips: {
    title: 'Consejos para mejores resultados',
    items: [
      'El chat indexa solo tras unos mensajes; espera un momento en hilos largos',
      'Activa «RAG activado» en Configuración (escritorio) para incluir Biblioteca y otros chats',
      'Sube documentos claros y con texto legible; nombra los archivos de forma descriptiva',
      'Haz preguntas concretas mencionando el tema o el documento si lo recuerdas',
      'Tras subir un PDF, espera a que diga «Indexado» antes de preguntar',
      'Ajusta Top K (más fragmentos) si necesitas respuestas más completas',
      'Las conversaciones se indexan solas; no hace falta copiarlas a Biblioteca',
    ],
  },
}

export interface RagLimitRow {
  label: string
  value: string
}

export function getRagLimits(
  capabilities: DeviceCapabilities | null,
  settings: AppSettings | null,
): RagLimitRow[] {
  const isMobile = capabilities ? isMobilePlatform(capabilities) : false
  const profile = capabilities ? computeGenerationProfile(capabilities) : null
  const ragActive = Boolean(settings?.ragEnabled) && !isMobile
  const chatMemoryActive = true

  const rows: RagLimitRow[] = [
    {
      label: 'Memoria del chat',
      value: chatMemoryActive
        ? 'Activa (indexa este hilo automáticamente)'
        : 'Desactivada',
    },
    {
      label: 'RAG global (documentos)',
      value: isMobile
        ? 'Solo en escritorio'
        : settings?.ragEnabled
          ? 'Activado'
          : 'Desactivado en ajustes',
    },
    {
      label: 'Fuentes de memoria',
      value: isMobile
        ? 'Solo el chat actual'
        : 'Chat actual + documentos + otras conversaciones',
    },
    {
      label: 'Formatos en Biblioteca',
      value: 'PDF y TXT',
    },
  ]

  if (settings) {
    rows.push(
      { label: 'Fragmentos por búsqueda (Top K)', value: String(settings.ragTopK) },
      { label: 'Presupuesto RAG', value: `${settings.ragTokenBudget} tokens` },
      { label: 'Tamaño de chunk', value: `${settings.chunkSize} caracteres` },
      { label: 'Solapamiento', value: `${Math.round(settings.chunkOverlap * 100)}%` },
    )
  }

  if (profile) {
    rows.push(
      {
        label: 'Memoria del chat en contexto',
        value: `Hasta ${Math.min(isMobile ? 400 : profile.maxRagTokens, settings?.ragTokenBudget ?? profile.maxRagTokens)} tokens recuperados`,
      },
      {
        label: 'Mensajes recientes',
        value: `~${profile.maxRecentMessages} además de la memoria buscada`,
      },
    )
  }

  if (profile && ragActive) {
    rows.push({
      label: 'RAG de documentos',
      value: `Hasta ${profile.maxRagTokens} tokens de contexto recuperado`,
    })
  }

  return rows
}
