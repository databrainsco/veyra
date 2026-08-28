# RAG en Veyra

## Pipeline

```
Pregunta del usuario
    ↓
Embedding (Transformers.js)
    ↓
Búsqueda vectorial (cosine similarity)
    ↓
Top-K resultados
    ↓
Context budget (max tokens)
    ↓
Prompt builder
    ↓
LLM
```

## Configuración por defecto

- Top K: 5
- RAG token budget: 4000
- Chunk size: 700 tokens
- Overlap: 15%

## Embedding model

`Xenova/all-MiniLM-L6-v2` — 384 dimensiones, ~23MB, optimizado para navegador.

## Vector Store

Implementación inicial: IndexedDB + cosine similarity en memoria.

Futuras alternativas: sqlite-vec, USearch, LanceDB.

## Contexto de conversación larga

Para conversaciones extensas:

```
System prompt
+ Conversation summary
+ Relevant memories (RAG)
+ Recent messages (últimos 10)
+ Current question
```

## Fuentes

Cada respuesta con RAG incluye referencias a:
- Documentos (nombre + página)
- Conversaciones (título + mensaje)
