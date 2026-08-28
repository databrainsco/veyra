import { ModelSpecialties } from './ModelSpecialties'
import { formatBytes } from '../../utils/helpers'
import type { InstalledModel, DeviceCapabilities } from '../../types'
import type { LLMCatalogEntry } from '../../services/llm/models'
import type { SpeechCatalogEntry } from '../../services/speech/speechModels'

type CatalogModel = LLMCatalogEntry | SpeechCatalogEntry

interface ModelCardProps {
  model: CatalogModel
  status: InstalledModel['status']
  compat: { compatible: boolean; reason?: string }
  isLoading: boolean
  progress: number
  isActive: boolean
  onDownload: () => void
  onDelete: () => void
}

export function ModelCard({
  model,
  status,
  compat,
  isLoading,
  progress,
  isActive,
  onDownload,
  onDelete,
}: ModelCardProps) {
  function statusLabel(s: InstalledModel['status']) {
    const labels: Record<InstalledModel['status'], string> = {
      not_installed: 'No instalado',
      downloading: 'Descargando',
      installed: 'Instalado',
      loading: 'Cargando',
      active: 'Activo',
      error: 'Error',
    }
    return labels[s]
  }

  function statusBadgeClass(s: InstalledModel['status']) {
    switch (s) {
      case 'active':
      case 'installed':
        return 'badge-success'
      case 'downloading':
      case 'loading':
        return 'badge-warning'
      case 'error':
        return 'badge-error'
      default:
        return 'badge-muted'
    }
  }

  const displayStatus = isActive && status !== 'not_installed' ? 'active' : status

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{model.name}</h3>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{model.provider}</div>
        </div>
        <span className={`badge ${statusBadgeClass(displayStatus)}`}>{statusLabel(displayStatus)}</span>
      </div>

      <ModelSpecialties model={model} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          fontSize: '0.8125rem',
          marginBottom: 16,
        }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Tamaño:</span> {formatBytes(model.sizeBytes)}
        </div>
        {model.category === 'llm' && (
          <>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Cuantización:</span> {model.quantization}
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Contexto:</span>{' '}
              {model.contextLength.toLocaleString()}
            </div>
          </>
        )}
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Backend:</span> {model.backend.toUpperCase()}
        </div>
      </div>

      {!compat.compatible && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginBottom: 12 }}>{compat.reason}</p>
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
          <button className="btn btn-primary" onClick={onDownload} disabled={isLoading || !compat.compatible}>
            {isLoading ? 'Descargando...' : 'Descargar'}
          </button>
        ) : isActive ? (
          <button className="btn btn-secondary" disabled>
            Activo
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onDownload} disabled={isLoading}>
            Activar
          </button>
        )}
        {(status === 'installed' || status === 'active' || status === 'error') && (
          <button className="btn btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

export function isSpeechCompatible(
  _modelId: string,
  _capabilities: DeviceCapabilities | null,
): { compatible: boolean; reason?: string } {
  return { compatible: true }
}
