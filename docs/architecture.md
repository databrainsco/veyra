# Arquitectura de Veyra

## Visión general

Veyra sigue una arquitectura modular local-first diseñada para ejecutar IA completamente en el dispositivo del usuario.

```
┌─────────────────────────────────────────┐
│              UI Layer (React)            │
│  Chat │ Memory │ Library │ Models │ Settings │
├─────────────────────────────────────────┤
│           Application Layer              │
│  Conversations │ Documents │ RAG │ Chat  │
├─────────────────────────────────────────┤
│            Service Layer                 │
│  LLMService │ EmbeddingService │ VectorStore │
├─────────────────────────────────────────┤
│           Storage Layer                  │
│  IndexedDB (idb) │ Repositories          │
└─────────────────────────────────────────┘
```

## Principios

1. **Local-first** — Todo el procesamiento ocurre en el dispositivo
2. **Abstracción** — Interfaces intercambiables (LLM, embeddings, vector store)
3. **Sin mocks** — No se simulan respuestas de IA
4. **Modular** — Cada feature en su propio módulo

## Flujo de datos

### Chat con RAG

```
User Question
    → EmbeddingService.embed()
    → VectorStore.search()
    → ContextBuilder
    → LLMService.generate()
    → Stream response + sources
```

### Indexación de documentos

```
File Upload
    → PDF.js / TextDecoder
    → Chunking
    → EmbeddingService.embedBatch()
    → VectorStore.add()
```

## Decisiones técnicas

- **WebLLM** elegido por soporte WebGPU, descarga real de modelos, y streaming
- **Transformers.js** para embeddings por compatibilidad con navegador y modelos cuantizados
- **IndexedDB** como vector store inicial por simplicidad y compatibilidad PWA
- **Cosine similarity** en memoria para búsqueda vectorial (suficiente para <100K vectores)
