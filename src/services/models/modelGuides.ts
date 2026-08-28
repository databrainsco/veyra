import type { ModelInfo, DeviceCapabilities } from '../../types'
import { computeGenerationProfile } from '../../utils/generationProfile'
import { isMobilePlatform } from '../../utils/device'

export interface ModelGuide {
  overview: string
  useCases: string[]
  knowledgeAreas: string[]
  limitations: string[]
  tips: string[]
}

export const MODEL_GUIDES: Record<string, ModelGuide> = {
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': {
    overview:
      'Modelo de conversación general de Meta, ligero para escritorio. Responde en español y otros idiomas con buen equilibrio entre velocidad y calidad para tareas cotidianas.',
    useCases: [
      'Preguntas de conocimiento general (historia, ciencia, cultura)',
      'Redactar correos, mensajes y textos cortos',
      'Explicar conceptos en palabras simples',
      'Ayuda básica con código y debugging',
      'Resumir textos que pegues en el chat',
      'Lluvia de ideas y listas',
    ],
    knowledgeAreas: [
      'Cultura general hasta su fecha de entrenamiento',
      'Español e inglés con buena fluidez',
      'Programación básica (Python, JS, HTML, etc.)',
      'Matemáticas y lógica de nivel escolar o introductorio',
      'Consejos prácticos y redacción',
    ],
    limitations: [
      'No tiene acceso a internet ni datos en tiempo real',
      'No ejecuta código ni escanea tu dispositivo',
      'Respuestas técnicas profundas limitadas por su tamaño (1B parámetros)',
      'Puede inventar datos si no está seguro (alucinaciones)',
      'No analiza imágenes ni audio directamente',
    ],
    tips: [
      'Sé concreto en la pregunta; si hace falta, da contexto en 2–3 frases',
      'Para código, pega solo el fragmento relevante',
      'En escritorio puedes activar RAG y subir PDFs en Biblioteca para preguntar sobre tus documentos',
    ],
  },
  'Llama-3.2-3B-Instruct-q4f16_1-MLC': {
    overview:
      'El modelo más equilibrado para escritorio en Veyra. Mayor capacidad de razonamiento y contexto largo que el 1B, ideal como modelo principal si tu PC tiene RAM suficiente.',
    useCases: [
      'Conversaciones largas y seguimiento de contexto',
      'Explicaciones detalladas de temas complejos',
      'Redacción, edición y reescritura de textos',
      'Programación intermedia y revisión de código',
      'Análisis de ideas, pros/contras, planificación',
      'Resúmenes de documentos indexados con RAG',
    ],
    knowledgeAreas: [
      'Conocimiento general amplio (humanidades, ciencias, actualidad histórica)',
      'Razonamiento y comparaciones',
      'Código en varios lenguajes',
      'Matemáticas y explicaciones paso a paso',
      'Tareas creativas (guiones, ideas, estructuras)',
    ],
    limitations: [
      'Sin internet: no consulta noticias, precios ni APIs externas',
      'No sustituye un IDE, compilador ni herramientas de seguridad',
      'Requiere ~6 GB RAM y WebGPU; no disponible en la mayoría de móviles',
      'Conocimiento con fecha de corte; eventos muy recientes pueden fallar',
    ],
    tips: [
      'Recomendado como modelo por defecto en PC con 6 GB+ RAM',
      'Combínalo con Memoria y Biblioteca para preguntar sobre tus archivos',
      'Si la respuesta es larga, sube max tokens en Configuración (escritorio)',
    ],
  },
  'Phi-3.5-mini-instruct-q4f16_1-MLC': {
    overview:
      'Modelo de Microsoft orientado a lógica, código y problemas técnicos. Muy bueno para desarrolladores y preguntas que requieren razonamiento estructurado.',
    useCases: [
      'Escribir y depurar código',
      'Explicar algoritmos y arquitectura de software',
      'Matemáticas y lógica',
      'Revisar fragmentos de código (incl. seguridad básica si pegas el código)',
      'Documentación técnica y comentarios en código',
      'Preguntas generales cuando quieres respuestas precisas y técnicas',
    ],
    knowledgeAreas: [
      'Programación (múltiples lenguajes)',
      'Ciencias exactas y razonamiento lógico',
      'Conceptos de ingeniería y sistemas',
      'Explicaciones técnicas en español',
      'Conocimiento general, con tono más analítico que creativo',
    ],
    limitations: [
      'Menos fluido en escritura creativa o conversación muy casual que Llama 3B',
      'Sin acceso a tu repositorio: solo ve lo que pegas o indexas',
      'No ejecuta tests ni herramientas de auditoría automáticamente',
      'Requiere escritorio con WebGPU y RAM suficiente',
    ],
    tips: [
      'Ideal si tu uso principal es código y preguntas técnicas',
      'Para vulnerabilidades: pega el código y pide revisión defensiva explícita',
      'Pide “paso a paso” o “solo el código primero” según prefieras',
    ],
  },
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': {
    overview:
      'El modelo más pequeño y rápido. Diseñado para móviles y respuestas cortas. Útil para consultas rápidas, no para análisis profundos o textos largos.',
    useCases: [
      'Preguntas cortas de cultura general',
      'Definiciones y explicaciones breves',
      'Traducciones simples y frases en varios idiomas',
      'Listas, ideas rápidas y recordatorios',
      'Ayuda muy básica con código',
    ],
    knowledgeAreas: [
      'Hechos generales y definiciones simples',
      'Español, inglés y otros idiomas a nivel básico',
      'Snippets de código muy cortos',
      'Conversación casual',
    ],
    limitations: [
      'Solo ~0.5B parámetros: calidad limitada frente a modelos grandes',
      'En móvil Veyra reduce contexto (~1024 tokens) y respuestas (~256 tokens)',
      'RAG y memoria desactivados en móvil por rendimiento',
      'Puede negarse o dar respuestas vagas en temas complejos (seguridad, legal, etc.)',
      'No apto para documentos largos ni conversaciones extensas',
    ],
    tips: [
      'Único modelo de chat recomendado en móvil por compatibilidad',
      'Haz preguntas cortas y directas',
      'Para trabajo serio (código, análisis), usa un PC con Llama 3B o Phi 3.5',
    ],
  },
  'Phi-3.5-vision-instruct-q4f16_1-MLC': {
    overview:
      'Modelo multimodal: entiende texto e imágenes. Puedes enviar fotos en el chat y preguntar qué aparece, leer texto en imágenes (OCR) o pedir descripciones visuales.',
    useCases: [
      'Describir el contenido de una foto',
      'Leer texto en capturas o documentos escaneados',
      'Preguntar sobre diagramas, gráficos o interfaces',
      'Combinar imagen + pregunta en lenguaje natural',
      'Chat de texto general (con más coste de memoria)',
    ],
    knowledgeAreas: [
      'Análisis visual y descripción de escenas',
      'OCR en imágenes con texto legible',
      'Razonamiento sobre lo que se ve en la imagen',
      'Texto y código como los demás modelos instruct',
    ],
    limitations: [
      'No procesa video ni audio',
      'Imágenes muy grandes o borrosas reducen la precisión',
      'Requiere ~8 GB RAM; no recomendado en móvil',
      'No “ve” tu pantalla ni archivos: solo imágenes que adjuntas en el chat',
    ],
    tips: [
      'Actívalo en Modelos y adjunta imagen con el botón + en Chat',
      'Pregunta concreta: “¿qué error muestra esta captura?” funciona mejor que “analiza”',
      'Para solo texto sin imágenes, un modelo más ligero puede ser más rápido',
    ],
  },
  'whisper-tiny': {
    overview:
      'Modelo de voz a texto (speech-to-text). Transcribe audio que adjuntas en el chat a texto en español, inglés y otros idiomas. No genera respuestas: solo convierte audio en texto.',
    useCases: [
      'Transcribir notas de voz',
      'Convertir grabaciones cortas a texto',
      'Dictar mensajes para luego enviarlos al chat',
      'Transcribir clips en español o inglés',
    ],
    knowledgeAreas: [
      'Reconocimiento de voz en múltiples idiomas',
      'Audio claro y sin mucho ruido de fondo',
    ],
    limitations: [
      'No responde preguntas: solo transcribe',
      'Calidad menor que Whisper Base en audio difícil',
      'Archivos muy largos pueden tardar o truncarse',
      'Acentos fuertes o mucho ruido reducen precisión',
    ],
    tips: [
      'Descárgalo junto con un modelo de chat (Qwen en móvil, Llama en PC)',
      'Graba en ambiente silencioso para mejores resultados',
      'Si necesitas más precisión, prueba Whisper Base',
    ],
  },
  'whisper-base': {
    overview:
      'Versión más precisa de Whisper para transcripción local. Mejor que Tiny en audio con ruido, varios hablantes o vocabulario técnico.',
    useCases: [
      'Transcripciones más fiables de entrevistas o reuniones',
      'Dictado con terminología técnica',
      'Audio con algo de ruido de fondo',
      'Notas de voz donde la exactitud importa',
    ],
    knowledgeAreas: [
      'Voz a texto en español, inglés y otros idiomas',
      'Audio de calidad media',
    ],
    limitations: [
      'Solo transcribe; no chatea ni analiza el contenido por sí solo',
      'Archivo más grande que Tiny (~150 MB)',
      'Audio muy largo consume tiempo y memoria',
    ],
    tips: [
      'Tras transcribir, el texto se envía al modelo de chat para resumir o analizar',
      'En móvil funciona, pero clips cortos dan mejor experiencia',
    ],
  },
}

export function getModelGuide(modelId: string): ModelGuide | undefined {
  return MODEL_GUIDES[modelId]
}

export interface VeyraLimitRow {
  label: string
  value: string
}

export function getVeyraLimitsForModel(
  model: ModelInfo,
  capabilities: DeviceCapabilities | null,
): VeyraLimitRow[] {
  const rows: VeyraLimitRow[] = []
  const isMobile = capabilities ? isMobilePlatform(capabilities) : false
  const profile = capabilities ? computeGenerationProfile(capabilities) : null

  rows.push({
    label: 'Dispositivo',
    value: isMobile ? 'Móvil (límites reducidos)' : 'Escritorio',
  })

  if (model.category === 'llm') {
    rows.push({
      label: 'Contexto del modelo',
      value: `${model.contextLength.toLocaleString()} tokens (máximo teórico)`,
    })

    if (profile) {
      rows.push({
        label: 'Contexto en Veyra',
        value: `~${profile.contextWindowSize.toLocaleString()} tokens`,
      })
      rows.push({
        label: 'Respuesta máxima',
        value: `~${profile.maxOutputTokens} tokens`,
      })
      rows.push({
        label: 'Memoria RAG',
        value: profile.maxRagTokens > 0 ? `Hasta ${profile.maxRagTokens} tokens` : 'Desactivada',
      })
      rows.push({
        label: 'Mensajes recientes',
        value: `~${profile.maxRecentMessages} en contexto`,
      })
    }

    rows.push({
      label: 'Móvil',
      value: model.deviceRequirements.mobileSupported
        ? 'Compatible'
        : 'No compatible (solo escritorio)',
    })
  } else {
    rows.push({
      label: 'Función',
      value: 'Transcripción de audio a texto en el chat',
    })
    rows.push({
      label: 'Móvil',
      value: model.deviceRequirements.mobileSupported ? 'Compatible' : 'No recomendado',
    })
  }

  rows.push({
    label: 'Internet',
    value: 'No requiere conexión tras descargar',
  })

  return rows
}
