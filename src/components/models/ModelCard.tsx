import { useState } from 'react'
import { ModelSpecialties } from './ModelSpecialties'
import { ModelInfoButton, ModelInfoModal } from './ModelInfoModal'
import { formatBytes } from '../../utils/helpers'
import type { InstalledModel, DeviceCapabilities } from '../../types'
import type { ModelCompatibility } from '../../utils/device'
import type { LLMCatalogEntry } from '../../services/llm/models'

interface ModelCardProps {
  model: LLMCatalogEntry
  status: InstalledModel['status']
  compat: ModelCompatibility
  capabilities: DeviceCapabilities | null
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
  capabilities,
  isLoading,
  progress,
  isActive,
  onDownload,
  onDelete,
}: ModelCardProps) {
  const [infoOpen, setInfoOpen] = useState(false)
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
  const canUse = compat.compatible
  const isInstalled = status === 'installed' || status === 'active' || status === 'error'

  return (
    <div
      className="card"
      style={{
        opacity: canUse || isInstalled ? 1 : 0.72,
        borderColor: canUse ? undefined : 'var(--border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{model.name}</h3>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{model.provider}</div>
          </div>
          <ModelInfoButton onClick={() => setInfoOpen(true)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className={`badge ${statusBadgeClass(displayStatus)}`}>{statusLabel(displayStatus)}</span>
          {!canUse && (
            <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>
              No compatible
            </span>
          )}
        </div>
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
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Cuantización:</span> {model.quantization}
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Contexto:</span>{' '}
          {model.contextLength.toLocaleString()}
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Backend:</span> {model.backend.toUpperCase()}
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>RAM mínima:</span>{' '}
          {model.deviceRequirements.minMemoryGB} GB
        </div>
      </div>

      {!canUse && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginBottom: 12 }}>{compat.reason}</p>
      )}

      {status === 'error' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--error)', marginBottom: 12 }}>
          La descarga o activación falló. Pulsa Descargar para reintentar.
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

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {status === 'not_installed' || status === 'error' ? (
          <button className="btn btn-primary" onClick={onDownload} disabled={isLoading || !canUse}>
            {isLoading ? 'Descargando...' : canUse ? 'Descargar' : 'No disponible'}
          </button>
        ) : isActive ? (
          <button className="btn btn-secondary" disabled>
            Activo
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onDownload} disabled={isLoading || !canUse}>
            {canUse ? 'Activar' : 'No disponible'}
          </button>
        )}
        {isInstalled && (
          <button className="btn btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        )}
      </div>

      <ModelInfoModal
        model={model}
        capabilities={capabilities}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </div>
  )
}
