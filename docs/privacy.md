# Privacidad en Veyra

## Principio

Veyra es local-first. Tus datos permanecen en tu dispositivo.

## Qué es local

| Proceso | Ubicación |
|---|---|
| Inferencia LLM | Navegador (WebGPU) |
| Generación de embeddings | Navegador (WASM) |
| Búsqueda vectorial | IndexedDB |
| Conversaciones | IndexedDB |
| Documentos | IndexedDB |
| Configuración | IndexedDB |

## Qué requiere Internet

| Proceso | Cuándo |
|---|---|
| Descarga de modelo LLM | Primera instalación |
| Descarga de modelo embeddings | Primera ejecución |
| Actualización de la PWA | Service worker |

## Después de la instalación

Con el modelo descargado, Veyra puede funcionar completamente offline.

## Lo que NO hacemos

- No enviamos conversaciones a servidores
- No almacenamos documentos en la nube
- No incluimos API keys en el frontend
- No afirmamos "100% privado" (el navegador y el SO tienen acceso)

## Transparencia

La sección de Privacidad en Configuración muestra claramente qué procesos son locales y cuáles requieren conexión.
