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
      'Solo ~0.5B parámetros: calidad limitada frente a modelos de 1.5B–4B',
      'En móvil Veyra reduce contexto y respuestas si tu RAM es baja',
      'Puede dar respuestas vagas en temas complejos',
      'No apto para documentos largos ni conversaciones muy extensas',
    ],
    tips: [
      'En móviles modestos es el más rápido; en flagships prueba Qwen 3.5 2B o 4B',
      'Haz preguntas cortas y directas',
      'Para trabajo serio en móvil, usa modelos de 2B–4B si tu RAM lo permite',
    ],
  },
  'Qwen3.5-4B-q4f16_1-MLC': {
    overview:
      'El modelo más capaz disponible solo para móvil en Veyra. Pensado para flagships como el S25 Ultra (~8 GB reportados por el navegador). Mejor razonamiento y respuestas más completas que modelos de 0.5B–2B.',
    useCases: [
      'Conversaciones largas con mejor seguimiento de contexto',
      'Explicaciones detalladas y resúmenes',
      'Programación intermedia y revisión de código pegado',
      'Redacción, ideas y planificación',
      'Preguntas técnicas en español',
    ],
    knowledgeAreas: [
      'Conocimiento general amplio',
      'Razonamiento y comparaciones',
      'Código en varios lenguajes',
      'Multilingüe (español con buena fluidez)',
    ],
    limitations: [
      'Solo móvil: no aparece en escritorio',
      'Descarga ~2.5 GB; la primera carga puede tardar',
      'Más lento que 0.5B–2B; puede calentar el dispositivo',
      'Sin internet ni datos en tiempo real',
    ],
    tips: [
      'Recomendado en S25 Ultra y móviles con 8 GB+ RAM reportada',
      'Veyra sube contexto y tokens de respuesta en gama alta',
      'Si va lento, prueba Qwen 3.5 2B como alternativa más ligera',
    ],
  },
  'Qwen3.5-2B-q4f16_1-MLC': {
    overview:
      'Excelente equilibrio calidad/velocidad en móviles potentes (6 GB+). Generación Qwen 3.5 más reciente que Qwen 2.5; suele superar a modelos más viejos de tamaño similar.',
    useCases: [
      'Chat diario con respuestas de mejor calidad',
      'Explicaciones y resúmenes moderados',
      'Ayuda con código y debugging básico-intermedio',
      'Multilingüe y redacción',
    ],
    knowledgeAreas: [
      'Cultura general y explicaciones',
      'Español e inglés',
      'Programación práctica',
      'Razonamiento ligero a medio',
    ],
    limitations: [
      'Solo móvil',
      'No sustituye un PC con Llama 3B para tareas muy largas',
      'Primera descarga de ~1.4 GB',
    ],
    tips: [
      'Buena opción si Qwen 3.5 4B va lento en tu navegador',
      'Combina con memoria de conversación (RAG del chat) en Veyra',
    ],
  },
  'Qwen2.5-3B-Instruct-q4f16_1-MLC': {
    overview:
      'Modelo instruct de 3B parámetros solo para móvil. Más capacidad que 1.5B; buen candidato si quieres máxima calidad en 6 GB sin llegar al 4B.',
    useCases: [
      'Chat avanzado y seguimiento de contexto',
      'Código y explicaciones técnicas',
      'Resúmenes de textos pegados en el chat',
      'Planificación y análisis de ideas',
    ],
    knowledgeAreas: [
      'Conocimiento general',
      'Código en varios lenguajes',
      'Razonamiento estructurado',
      'Español fluido',
    ],
    limitations: [
      'Solo móvil; descarga ~1.9 GB',
      'Puede ser más lento que Qwen 3.5 2B en algunos dispositivos',
      'Sin acceso a internet',
    ],
    tips: [
      'Prueba este o Qwen 3.5 2B y quédate con el que mejor equilibre velocidad y calidad',
    ],
  },
  'Hermes-3-Llama-3.2-3B-q4f16_1-MLC': {
    overview:
      'Variante Hermes 3 sobre Llama 3.2 3B, afinada para seguir instrucciones y conversación natural en móvil potente.',
    useCases: [
      'Chat con tono conversacional',
      'Instrucciones paso a paso',
      'Escritura creativa ligera',
      'Código y preguntas técnicas',
    ],
    knowledgeAreas: [
      'Diálogo e instrucciones',
      'Conocimiento general',
      'Programación básica-intermedia',
    ],
    limitations: [
      'Solo móvil con 6 GB+ RAM',
      'Modelo más pesado (~2.1 GB)',
    ],
    tips: [
      'Útil si prefieres el estilo Llama/Hermes frente a Qwen',
    ],
  },
  'gemma-2-2b-it-q4f16_1-MLC': {
    overview:
      'Gemma 2 de Google, 2B parámetros, optimizado para móvil de gama alta. Buena redacción y respuestas claras en español.',
    useCases: [
      'Redacción y corrección de textos',
      'Preguntas generales',
      'Explicaciones sencillas',
      'Chat cotidiano',
    ],
    knowledgeAreas: [
      'Redacción en varios idiomas',
      'Conocimiento general',
      'Razonamiento moderado',
    ],
    limitations: [
      'Solo móvil 6 GB+',
      'Menos orientado a código que Phi o Qwen 3B',
    ],
    tips: [
      'Buena alternativa si ya conoces el ecosistema Gemma',
    ],
  },
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': {
    overview:
      'Salto de calidad respecto a 0.5B para móviles con 4 GB RAM. Equilibrio entre tamaño y capacidad.',
    useCases: [
      'Chat general',
      'Explicaciones breves-medianas',
      'Código básico',
      'Multilingüe',
    ],
    knowledgeAreas: [
      'Hechos generales',
      'Español e inglés',
      'Snippets de código',
    ],
    limitations: [
      'Por debajo de 2B–4B en temas complejos',
      'Contexto reducido en móvil (~1024 tokens en Veyra si RAM < 6 GB)',
    ],
    tips: [
      'Recomendado si tu móvil reporta ~4 GB y no puedes cargar modelos de 6 GB+',
    ],
  },
  'SmolLM2-1.7B-Instruct-q4f16_1-MLC': {
    overview:
      'Modelo eficiente de Hugging Face (~1.7B). Buen rendimiento en móviles de gama media-alta con 4 GB+.',
    useCases: [
      'Instrucciones y tareas cortas',
      'Razonamiento ligero',
      'Código básico',
      'Chat rápido con mejor calidad que 0.5B',
    ],
    knowledgeAreas: [
      'Seguimiento de instrucciones',
      'Conocimiento general compacto',
      'Código introductorio',
    ],
    limitations: [
      'No alcanza la profundidad de 3B–4B',
      'Requiere 4 GB RAM móvil',
    ],
    tips: [
      'Compara con Qwen 2.5 1.5B en tu dispositivo y elige el más fluido',
    ],
  },
  'gemma3-1b-it-q4f16_1-MLC': {
    overview:
      'Gemma 3 compacto (~1B). Mejor comprensión que 0.5B sin exigir un flagship.',
    useCases: [
      'Chat diario',
      'Respuestas claras en español',
      'Preguntas cortas',
      'Definiciones',
    ],
    knowledgeAreas: [
      'Redacción clara',
      'Multilingüe básico',
      'Conocimiento general ligero',
    ],
    limitations: [
      '3 GB RAM mínimo',
      'Temas muy técnicos o largos: mejor 1.5B+',
    ],
    tips: [
      'Buen paso intermedio entre 0.5B y 1.5B',
    ],
  },
  'Qwen3.5-0.8B-q4f16_1-MLC': {
    overview:
      'Sucesor ligero de la familia Qwen 3.5. Mejor que 0.5B en comprensión manteniendo velocidad en móviles de 3 GB+.',
    useCases: [
      'Consultas rápidas',
      'Definiciones y listas',
      'Chat casual',
      'Traducciones simples',
    ],
    knowledgeAreas: [
      'Hechos generales básicos',
      'Español e inglés',
      'Respuestas breves',
    ],
    limitations: [
      'No para análisis profundos ni documentos largos',
      'Por debajo de modelos 1.5B+ en calidad',
    ],
    tips: [
      'Ideal si 0.5B se queda corto pero no tienes RAM para 1.5B',
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
      value: model.deviceRequirements.mobileOnly
        ? 'Solo móvil'
        : model.deviceRequirements.mobileSupported
          ? 'Compatible'
          : 'No compatible (solo escritorio)',
    })
  }

  rows.push({
    label: 'Internet',
    value: 'No requiere conexión tras descargar',
  })

  return rows
}
