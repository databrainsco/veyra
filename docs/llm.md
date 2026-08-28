# LLM en Veyra

## Runtime: WebLLM

Veyra utiliza [@mlc-ai/web-llm](https://webllm.mlc.ai/) para ejecutar modelos de lenguaje localmente en el navegador.

### Por qué WebLLM

- Soporte nativo de WebGPU
- Descarga y caché real de modelos
- Streaming de tokens
- Modelos pre-compilados para MLC
- API compatible con OpenAI chat completions

### Interfaz

```typescript
interface LLMService {
  initialize(): Promise<void>
  loadModel(modelId: string): Promise<void>
  unloadModel(): Promise<void>
  isLoaded(): boolean
  generate(messages, options?): AsyncIterable<string>
  getModelInfo(): ModelInfo | null
}
```

### Modelos disponibles

Los modelos se descargan desde los servidores de MLC AI la primera vez. Después se cachean localmente.

### Cambiar de runtime

Para usar otro runtime (ONNX Runtime Web, llama.cpp WASM):

1. Crear nueva implementación de `LLMService`
2. Registrar en el factory
3. La UI no necesita cambios

## Requisitos

- WebGPU habilitado
- Suficiente memoria RAM
- Conexión a Internet solo para la descarga inicial
