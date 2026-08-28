import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS } from '../../services/llm/models'
import { AVAILABLE_SPEECH_MODELS } from '../../services/speech/speechModels'
import { modelRepo } from '../../db/repositories/settingsRepository'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { getSpeechService } from '../../services/speech/TransformersSpeechService'
import { detectDeviceCapabilities, isModelCompatible } from '../../utils/device'
import { ModelCard, isSpeechCompatible } from '../../components/models/ModelCard'
import type { InstalledModel, DeviceCapabilities } from '../../types'

export function ModelsPage() {
  const [installed, setInstalled] = useState<InstalledModel[]>([])
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [activeSpeechModelId, setActiveSpeechModelId] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function loadState() {
    const [models, settings, caps] = await Promise.all([
      modelRepo.getAll(),
      settingsRepo.get(),
      detectDeviceCapabilities(),
    ])
    setInstalled(models)
    setActiveModelId(settings.activeModelId)
    setActiveSpeechModelId(settings.activeSpeechModelId)
    setCapabilities(caps)
  }

  useEffect(() => {
    loadState()
  }, [])

  function getStatus(modelId: string, type: 'llm' | 'speech'): InstalledModel['status'] {
    const record = installed.find((m) => m.modelId === modelId)
    if (type === 'llm' && activeModelId === modelId && getLLMService().isLoaded()) return 'active'
    if (type === 'speech' && activeSpeechModelId === modelId && getSpeechService().isLoaded()) {
      return 'active'
    }
    return record?.status ?? 'not_installed'
  }

  async function handleDownloadLlm(modelId: string) {
    setLoadingModel(modelId)
    setError(null)
    setProgress(0)

    try {
      const llm = getLLMService()
      await llm.loadModel(modelId, (p) => setProgress(p))
      await settingsRepo.update({ activeModelId: modelId })
      setActiveModelId(modelId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar')
    } finally {
      setLoadingModel(null)
    }
  }

  async function handleDeleteLlm(modelId: string) {
    if (!confirm('¿Eliminar este modelo?')) return
    const llm = getLLMService()
    if (activeModelId === modelId) {
      await llm.unloadModel()
      await settingsRepo.update({ activeModelId: null })
    }
    await modelRepo.delete(modelId)
    await loadState()
  }

  async function handleDownloadSpeech(modelId: string) {
    setLoadingModel(modelId)
    setError(null)
    setProgress(0)

    try {
      const speech = getSpeechService()
      await speech.loadModel(modelId, (p) => setProgress(p))
      await settingsRepo.update({ activeSpeechModelId: modelId })
      setActiveSpeechModelId(modelId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar modelo de audio')
    } finally {
      setLoadingModel(null)
    }
  }

  async function handleDeleteSpeech(modelId: string) {
    if (!confirm('¿Eliminar este modelo de audio?')) return
    const speech = getSpeechService()
    if (activeSpeechModelId === modelId) {
      await speech.unload()
      await settingsRepo.update({ activeSpeechModelId: null })
    }
    await modelRepo.delete(modelId)
    await loadState()
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Modelos</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>
        Modelos locales descargables para texto, imágenes y audio.
      </p>

      {capabilities && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8125rem' }}>
            <span>WebGPU: {capabilities.webgpu ? '✓' : '✗'}</span>
            <span>Plataforma: {capabilities.platform}</span>
            <span>Navegador: {capabilities.browser}</span>
            {capabilities.estimatedMemoryGB && (
              <span>RAM: ~{capabilities.estimatedMemoryGB} GB</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            background: 'rgba(255,71,87,0.1)',
            borderRadius: 8,
            marginBottom: 16,
            color: 'var(--error)',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <h2 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
        Lenguaje (chat y visión)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {AVAILABLE_MODELS.map((model) => {
          const status = getStatus(model.id, 'llm')
          const compat = capabilities ? isModelCompatible(model.id, capabilities) : { compatible: true }
          const isLoading = loadingModel === model.id

          return (
            <ModelCard
              key={model.id}
              model={model}
              status={status}
              compat={compat}
              isLoading={isLoading}
              progress={progress}
              isActive={activeModelId === model.id}
              onDownload={() => handleDownloadLlm(model.id)}
              onDelete={() => handleDeleteLlm(model.id)}
            />
          )
        })}
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
        Audio (voz a texto)
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 12 }}>
        Transcribe notas de voz y audio a texto en el chat. No genera voz ni música.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {AVAILABLE_SPEECH_MODELS.map((model) => {
          const status = getStatus(model.id, 'speech')
          const compat = isSpeechCompatible(model.id, capabilities)
          const isLoading = loadingModel === model.id

          return (
            <ModelCard
              key={model.id}
              model={model}
              status={status}
              compat={compat}
              isLoading={isLoading}
              progress={progress}
              isActive={activeSpeechModelId === model.id}
              onDownload={() => handleDownloadSpeech(model.id)}
              onDelete={() => handleDeleteSpeech(model.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
