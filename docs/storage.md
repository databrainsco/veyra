# Almacenamiento en Veyra

## IndexedDB

Base de datos principal con los siguientes object stores:

| Store | Contenido |
|---|---|
| conversations | Metadatos de conversaciones |
| messages | Mensajes de chat |
| documents | Metadatos de documentos |
| documentBlobs | Archivos originales |
| chunks | Fragmentos con embeddings |
| summaries | Resúmenes de conversaciones |
| models | Estado de modelos instalados |
| settings | Configuración de la app |

## Repositorios

Capa de abstracción sobre IndexedDB. Los componentes React nunca acceden directamente a la base de datos.

## Persistencia

Veyra solicita almacenamiento persistente para evitar que el navegador elimine datos bajo presión de espacio.

## Backup

Formato: `veyra-backup.json`

Incluye conversaciones, mensajes, documentos (metadata), chunks, summaries y configuración.

Los embeddings pueden no ser compatibles entre versiones del modelo de embeddings.

## Uso de almacenamiento

| Tipo | Estimación |
|---|---|
| Modelo LLM | 400 MB - 2.3 GB |
| Embeddings | ~1.5 KB por chunk |
| Documentos | Tamaño original |
| Conversaciones | ~500 bytes por mensaje |
