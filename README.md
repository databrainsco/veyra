# Veyra

**Your AI. Your memory. Your device.**

Veyra es una IA personal que vive en tu dispositivo. Conversa con un LLM local, guarda tus conversaciones permanentemente y conviértelas en memoria consultable mediante RAG.

## Características

- **LLM local** — Ejecución en el navegador con WebGPU (WebLLM)
- **Memoria semántica** — RAG con embeddings locales (Transformers.js)
- **Biblioteca de documentos** — PDF y TXT indexados localmente
- **Conversaciones persistentes** — Almacenadas en IndexedDB
- **PWA** — Instalable, funciona offline después de descargar el modelo
- **Privacidad** — Sin backend obligatorio, datos en tu dispositivo

## Arquitectura

```
UI (React)
    ↓
Application Layer
    ↓
├── LLMService (WebLLM)
├── EmbeddingService (Transformers.js)
├── VectorStore (IndexedDB + cosine similarity)
├── RAGService
└── Storage (IndexedDB)
```

## Stack

| Componente | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite |
| LLM | @mlc-ai/web-llm (WebGPU) |
| Embeddings | @xenova/transformers |
| Vector Store | IndexedDB + cosine similarity |
| PDF | pdfjs-dist |
| PWA | vite-plugin-pwa |
| Storage | IndexedDB (idb) |

## Requisitos

- Navegador con soporte WebGPU (Chrome 113+, Edge 113+, Safari 18+)
- Mínimo 2 GB RAM (4-6 GB recomendado para modelos grandes)
- Espacio de almacenamiento según el modelo (400 MB - 2.3 GB)

## Desarrollo

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
```

## Deployment (GitHub Pages)

La app se despliega automáticamente con GitHub Actions al hacer push a `main`.

Configura la base path en `vite.config.ts` o con `VITE_BASE_PATH`.

## Modelos soportados

| Modelo | Tamaño | Contexto |
|---|---|---|
| Qwen 2.5 0.5B | ~400 MB | 4K |
| Llama 3.2 1B | ~900 MB | 4K |
| Llama 3.2 3B | ~2.1 GB | 8K |
| Phi 3.5 Mini | ~2.3 GB | 4K |

## Limitaciones conocidas

| Limitación | Por qué | Alternativa |
|---|---|---|
| WebGPU requerido | Los LLMs necesitan aceleración GPU | Usar modelo más pequeño o navegador compatible |
| Safari iOS limitado | WebGPU en iOS es reciente y restrictivo | Chrome en Android, desktop |
| Memoria del navegador | Los modelos grandes requieren mucha RAM | Modelos cuantizados 4-bit |
| Sin ejecución en background | Limitación de PWAs | App nativa futura |

## Privacidad

- LLM: Local (después de descargar)
- Embeddings: Local
- RAG: Local
- Conversaciones: Local (IndexedDB)
- Documentos: Local (IndexedDB)
- Internet: Solo necesario para descargar modelos

## Licencia

MIT
