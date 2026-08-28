import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS } from '../../services/llm/models'
import { AVAILABLE_SPEECH_MODELS } from '../../services/speech/speechModels'
import { modelRepo } from '../../db/repositories/settingsRepository'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { getSpeechService } from '../../services/speech/TransformersSpeechService'
import {
  detectDeviceCapabilities,
  DEVICE_COMPATIBILITY_TIERS,
  getEffectiveMemoryGB,
  getRecommendedModelId,
  isMobilePlatform,
  isModelCompatible,
  isSpeechCompatible,
  partitionByCompatibility,
} from '../../utils/device'
import { getModelInfo } from '../../services/llm/models'
import { ModelCard } from '../../components/models/ModelCard'
import type { InstalledModel, DeviceCapabilities } from '../../types'
import type { LLMCatalogEntry } from '../../services/llm/models'
import type { SpeechCatalogEntry } from '../../services/speech/speechModels'
import './ModelsPage.css'

function ModelSection({
  title,
  models,
  capabilities,
  type,
  getStatus,
  loadingModel,
  progress,
  activeId,
  onDownload,
  onDelete,
}: {
  title: string
  models: Array<LLMCatalogEntry | SpeechCatalogEntry>
  capabilities: DeviceCapabilities | null
  type: 'llm' | 'speech'
  getStatus: (modelId: string, type: 'llm' | 'speech') => InstalledModel['status']
  loadingModel: string | null
  progress: number
  activeId: string | null
  onDownload: (modelId: string) => void
  onDelete: (modelId: string) => void
}) {
  if (models.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {models.map((model) => {
          const status = getStatus(model.id, type)
          const compat = capabilities
            ? type === 'llm'
              ? isModelCompatible(model.id, capabilities)
              : isSpeechCompatible(model.id, capabilities)
            : { compatible: false, reason: 'Comprobando compatibilidad...' }

          return (
            <ModelCard
              key={model.id}
              model={model}
              status={status}
              compat={compat}
              isLoading={loadingModel === model.id}
              progress={progress}
              isActive={activeId === model.id}
              onDownload={() => onDownload(model.id)}
              onDelete={() => onDelete(model.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

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

    if (settings.activeModelId && !isModelCompatible(settings.activeModelId, caps).compatible) {
      const llm = getLLMService()
      if (llm.getActiveModelId() === settings.activeModelId) {
        await llm.unloadModel()
      }
      await settingsRepo.update({ activeModelId: null })
      setActiveModelId(null)
    }
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
    if (!capabilities) return

    const compat = isModelCompatible(modelId, capabilities)
    if (!compat.compatible) {
      setError(compat.reason ?? 'Este modelo no es compatible con tu dispositivo.')
      return
    }

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
    if (!capabilities) return

    const compat = isSpeechCompatible(modelId, capabilities)
    if (!compat.compatible) {
      setError(compat.reason ?? 'Este modelo de audio no es compatible con tu dispositivo.')
      return
    }

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

  const recommendedModelId = capabilities ? getRecommendedModelId(capabilities) : null
  const recommendedModel = recommendedModelId ? getModelInfo(recommendedModelId) : null
  const llmPartitions = capabilities
    ? partitionByCompatibility(AVAILABLE_MODELS, capabilities)
    : { compatible: AVAILABLE_MODELS, incompatible: [] as LLMCatalogEntry[] }
  const speechPartitions = capabilities
    ? partitionByCompatibility(AVAILABLE_SPEECH_MODELS, capabilities)
    : { compatible: AVAILABLE_SPEECH_MODELS, incompatible: [] as SpeechCatalogEntry[] }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Modelos</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>
        Solo puedes descargar modelos compatibles con tu dispositivo.
      </p>

      <details className="models-collapsible card" style={{ marginBottom: 24 }}>
        <summary className="models-collapsible-summary">
          Dispositivos compatibles
        </summary>
        <div className="models-collapsible-body">
          {DEVICE_COMPATIBILITY_TIERS.map((tier) => (
            <div key={tier.deviceLabel} className="models-tier-card">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tier.deviceLabel}</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{tier.requirements}</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Chat: {tier.llmModels.join(', ')}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Audio: {tier.speechModels.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </details>

      {capabilities && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.9375rem', marginBottom: 12 }}>Tu dispositivo</h2>
          <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>WebGPU: {capabilities.webgpu ? 'Sí' : 'No'}</span>
            <span>Plataforma: {capabilities.platform}</span>
            <span>Navegador: {capabilities.browser}</span>
            <span>RAM estimada: ~{getEffectiveMemoryGB(capabilities)} GB</span>
            <span>Tipo: {isMobilePlatform(capabilities) ? 'Móvil' : 'Escritorio'}</span>
          </div>
          {recommendedModel && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 12, marginBottom: 0 }}>
              Recomendado para ti: <strong>{recommendedModel.name}</strong>
            </p>
          )}
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

      <h2 style={{ fontSize: '1rem', marginBottom: 16, color: 'var(--text-secondary)' }}>
        Lenguaje (chat y visión)
      </h2>

      <ModelSection
        title="Compatibles con tu dispositivo"
        models={llmPartitions.compatible}
        capabilities={capabilities}
        type="llm"
        getStatus={getStatus}
        loadingModel={loadingModel}
        progress={progress}
        activeId={activeModelId}
        onDownload={handleDownloadLlm}
        onDelete={handleDeleteLlm}
      />

      <ModelSection
        title="No compatibles con tu dispositivo"
        models={llmPartitions.incompatible}
        capabilities={capabilities}
        type="llm"
        getStatus={getStatus}
        loadingModel={loadingModel}
        progress={progress}
        activeId={activeModelId}
        onDownload={handleDownloadLlm}
        onDelete={handleDeleteLlm}
      />

      <h2
        style={{
          fontSize: '1rem',
          marginBottom: 16,
          marginTop: 32,
          color: 'var(--text-secondary)',
        }}
      >
        Audio (voz a texto)
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
        Transcribe notas de voz y audio a texto en el chat.
      </p>

      <ModelSection
        title="Compatibles con tu dispositivo"
        models={speechPartitions.compatible}
        capabilities={capabilities}
        type="speech"
        getStatus={getStatus}
        loadingModel={loadingModel}
        progress={progress}
        activeId={activeSpeechModelId}
        onDownload={handleDownloadSpeech}
        onDelete={handleDeleteSpeech}
      />

      <ModelSection
        title="No compatibles con tu dispositivo"
        models={speechPartitions.incompatible}
        capabilities={capabilities}
        type="speech"
        getStatus={getStatus}
        loadingModel={loadingModel}
        progress={progress}
        activeId={activeSpeechModelId}
        onDownload={handleDownloadSpeech}
        onDelete={handleDeleteSpeech}
      />
    </div>
  )
}
