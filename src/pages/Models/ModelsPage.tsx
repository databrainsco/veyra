import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS } from '../../services/llm/models'
import { modelRepo } from '../../db/repositories/settingsRepository'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { detectDeviceCapabilities, isModelCompatible } from '../../utils/device'
import { formatBytes } from '../../utils/helpers'
import type { InstalledModel, DeviceCapabilities } from '../../types'

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
  }

  useEffect(() => {
    loadState()
  }, [])

  function getStatus(modelId: string): InstalledModel['status'] {
    const record = installed.find((m) => m.modelId === modelId)
    if (activeModelId === modelId && getLLMService().isLoaded()) return 'active'
    return record?.status ?? 'not_installed'
  }

  async function handleDownload(modelId: string) {
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

  async function handleDelete(modelId: string) {
    if (!confirm('¿Eliminar este modelo?')) return
    const llm = getLLMService()
    if (activeModelId === modelId) {
      await llm.unloadModel()
      await settingsRepo.update({ activeModelId: null })
    }
    await modelRepo.delete(modelId)
    await loadState()
  }

  function statusLabel(status: InstalledModel['status']) {
    const labels: Record<InstalledModel['status'], string> = {
      not_installed: 'No instalado',
      downloading: 'Descargando',
      installed: 'Instalado',
      loading: 'Cargando',
      active: 'Activo',
      error: 'Error',
    }
    return labels[status]
  }

  function statusBadgeClass(status: InstalledModel['status']) {
    switch (status) {
      case 'active': return 'badge-success'
      case 'installed': return 'badge-success'
      case 'downloading':
      case 'loading': return 'badge-warning'
      case 'error': return 'badge-error'
      default: return 'badge-muted'
    }
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Modelos</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>
        Modelos de IA local para ejecutar en tu dispositivo.
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
        <div style={{ padding: 12, background: 'rgba(255,71,87,0.1)', borderRadius: 8, marginBottom: 16, color: 'var(--error)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {AVAILABLE_MODELS.map((model) => {
          const status = getStatus(model.id)
          const compat = capabilities ? isModelCompatible(model.id, capabilities) : { compatible: true }
          const isLoading = loadingModel === model.id

          return (
            <div key={model.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{model.name}</h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{model.provider}</div>
                </div>
                <span className={`badge ${statusBadgeClass(status)}`}>{statusLabel(status)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: '0.8125rem', marginBottom: 16 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Tamaño:</span> {formatBytes(model.sizeBytes)}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Cuantización:</span> {model.quantization}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Contexto:</span> {model.contextLength.toLocaleString()}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Backend:</span> {model.backend.toUpperCase()}</div>
              </div>

              {!compat.compatible && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginBottom: 12 }}>
                  {compat.reason}
                </p>
              )}

              {isLoading && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Descargando... {Math.round(progress * 100)}%
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatBytes(progress * model.sizeBytes)} / {formatBytes(model.sizeBytes)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {status === 'not_installed' || status === 'error' ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(model.id)}
                    disabled={isLoading || !compat.compatible}
                  >
                    {isLoading ? 'Descargando...' : 'Descargar'}
                  </button>
                ) : status === 'active' ? (
                  <button className="btn btn-secondary" disabled>Activo</button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(model.id)}
                    disabled={isLoading}
                  >
                    Activar
                  </button>
                )}
                {(status === 'installed' || status === 'active' || status === 'error') && (
                  <button className="btn btn-danger" onClick={() => handleDelete(model.id)}>
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
