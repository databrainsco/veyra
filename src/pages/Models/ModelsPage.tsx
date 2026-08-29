import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS, getModelInfo, getModelsForDevice } from '../../services/llm/models'
import { modelRepo } from '../../db/repositories/settingsRepository'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { getLLMService } from '../../services/llm/LocalLLMService'
import {
  detectDeviceCapabilities,
  DEVICE_COMPATIBILITY_TIERS,
  getEffectiveMemoryGB,
  getRecommendedModelId,
  isMobilePlatform,
  isModelCompatible,
  partitionByCompatibility,
} from '../../utils/device'
import { ModelCard } from '../../components/models/ModelCard'
import type { InstalledModel, DeviceCapabilities } from '../../types'
import type { LLMCatalogEntry } from '../../services/llm/models'
import './ModelsPage.css'

function ModelSection({
  title,
  models,
  capabilities,
  getStatus,
  loadingModel,
  progress,
  activeId,
  onDownload,
  onDelete,
}: {
  title: string
  models: LLMCatalogEntry[]
  capabilities: DeviceCapabilities | null
  getStatus: (modelId: string) => InstalledModel['status']
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
          const status = getStatus(model.id)
          const compat = capabilities
            ? isModelCompatible(model.id, capabilities)
            : { compatible: false, reason: 'Comprobando compatibilidad...' }

          return (
            <ModelCard
              key={model.id}
              model={model}
              status={status}
              compat={compat}
              capabilities={capabilities}
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

  function getStatus(modelId: string): InstalledModel['status'] {
    const record = installed.find((m) => m.modelId === modelId)
    if (activeModelId === modelId && getLLMService().isLoaded()) return 'active'
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

    const existing = await modelRepo.get(modelId)
    if (existing?.status === 'error') {
      await modelRepo.save({ modelId, status: 'not_installed', errorMessage: undefined })
    }

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

  const recommendedModelId = capabilities ? getRecommendedModelId(capabilities) : null
  const recommendedModel = recommendedModelId ? getModelInfo(recommendedModelId) : null
  const catalogModels = capabilities ? getModelsForDevice(capabilities) : AVAILABLE_MODELS
  const llmPartitions = capabilities
    ? partitionByCompatibility(catalogModels, capabilities)
    : { compatible: catalogModels, incompatible: [] as LLMCatalogEntry[] }
  const isMobile = capabilities ? isMobilePlatform(capabilities) : false

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Modelos</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>
        Solo puedes descargar modelos compatibles con tu dispositivo. Toca el botón de información
        en cada modelo para ver qué puede hacer, sus límites y qué tipo de preguntas admite.
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
                Modelos: {tier.llmModels.join(', ')}
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
              {isMobile && getEffectiveMemoryGB(capabilities!) >= 6 && (
                <span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>
                  Tu móvil tiene RAM suficiente para modelos potentes (2B–3B).
                </span>
              )}
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

      <ModelSection
        title="Compatibles con tu dispositivo"
        models={llmPartitions.compatible}
        capabilities={capabilities}
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
        getStatus={getStatus}
        loadingModel={loadingModel}
        progress={progress}
        activeId={activeModelId}
        onDownload={handleDownloadLlm}
        onDelete={handleDeleteLlm}
      />
    </div>
  )
}
