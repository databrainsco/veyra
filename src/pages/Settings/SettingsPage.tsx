import { useState, useEffect, useRef } from 'react'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { storageManager } from '../../services/storage/storageManager'
import { exportBackup, importBackup, downloadBackup } from '../../services/storage/backupService'
import { formatBytes } from '../../utils/helpers'
import { formatBuildDateTime, formatDeploymentVersion, formatUpToDateMessage } from '../../utils/version'
import { checkForUpdates, isUpdateSupported, type UpdateCheckResult } from '../../services/update/updateService'
import { detectDeviceCapabilities } from '../../utils/device'
import { RagInfoButton, RagInfoModal } from '../../components/rag/RagInfoModal'
import type { AppSettings, StorageUsage, DeviceCapabilities } from '../../types'

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [persisted, setPersisted] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | UpdateCheckResult>('idle')
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [ragInfoOpen, setRagInfoOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    settingsRepo.get().then(setSettings)
    storageManager.getUsage().then(setUsage)
    detectDeviceCapabilities().then(setCapabilities)
    if (navigator.storage?.persisted) {
      navigator.storage.persisted().then(setPersisted)
    }
  }, [])

  async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = await settingsRepo.update({ [key]: value })
    setSettings(updated)
  }

  async function handleExport() {
    const data = await exportBackup()
    downloadBackup(data)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const data = JSON.parse(text)

    const confirmed = confirm(
      `Este backup contiene:\n\n${data.conversations?.length ?? 0} conversaciones\n${data.documents?.length ?? 0} documentos\n${data.chunks?.length ?? 0} chunks\n\n¿Deseas importar?`,
    )

    if (confirmed) {
      await importBackup(data, 'merge')
      alert('Backup importado correctamente')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleClearAll() {
    if (!confirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.')) return
    await storageManager.clearAll()
    alert('Datos eliminados')
    window.location.reload()
  }

  async function handleRequestPersistence() {
    const result = await storageManager.requestPersistence()
    setPersisted(result)
  }

  async function handleCheckUpdates() {
    setUpdateStatus('checking')
    const result = await checkForUpdates()
    setUpdateStatus(result)
  }

  function updateStatusMessage(): string | null {
    switch (updateStatus) {
      case 'checking':
        return 'Buscando actualizaciones...'
      case 'uptodate':
        return formatUpToDateMessage()
      case 'unsupported':
        return 'Las actualizaciones automáticas requieren la app instalada o un navegador compatible.'
      case 'error':
        return 'No se pudo comprobar actualizaciones. Intenta de nuevo.'
      case 'updated':
        return 'Actualización encontrada. Recargando...'
      default:
        return null
    }
  }

  if (!settings) return null

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 24 }}>Configuración</h1>

      <Section title="General">
        <SettingRow label="Idioma">
          <select
            className="input-field"
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value as 'es' | 'en')}
            style={{ width: 'auto' }}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </SettingRow>
        <SettingRow label="Tema">
          <select
            className="input-field"
            value={settings.theme}
            onChange={(e) => updateSetting('theme', e.target.value as AppSettings['theme'])}
            style={{ width: 'auto' }}
          >
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
            <option value="system">Sistema</option>
          </select>
        </SettingRow>
        <SettingRow label="Versión">
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {formatDeploymentVersion()}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
              {formatBuildDateTime()}
            </div>
          </div>
        </SettingRow>
        <div style={{ paddingTop: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={handleCheckUpdates}
            disabled={updateStatus === 'checking'}
            style={{ width: '100%' }}
          >
            {updateStatus === 'checking' ? 'Buscando...' : 'Buscar actualizaciones'}
          </button>
          {updateStatusMessage() && (
            <p
              style={{
                marginTop: 8,
                fontSize: '0.8125rem',
                color: updateStatus === 'error' ? 'var(--error)' : 'var(--text-muted)',
              }}
            >
              {updateStatusMessage()}
            </p>
          )}
          {!isUpdateSupported() && updateStatus === 'idle' && (
            <p style={{ marginTop: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Service Worker no disponible en este entorno.
            </p>
          )}
        </div>
      </Section>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>Memoria / RAG</h2>
          <RagInfoButton onClick={() => setRagInfoOpen(true)} />
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Busca en tus conversaciones y documentos al responder en el chat. Toca ⓘ para ver ejemplos y
          alcance.
        </p>
        <SettingRow label="RAG activado">
          <input
            type="checkbox"
            checked={settings.ragEnabled}
            onChange={(e) => updateSetting('ragEnabled', e.target.checked)}
          />
        </SettingRow>
        <SettingRow label="Top K">
          <input
            type="number"
            className="input-field"
            value={settings.ragTopK}
            onChange={(e) => updateSetting('ragTopK', parseInt(e.target.value) || 5)}
            style={{ width: 80 }}
            min={1}
            max={20}
          />
        </SettingRow>
        <SettingRow label="RAG token budget">
          <input
            type="number"
            className="input-field"
            value={settings.ragTokenBudget}
            onChange={(e) => updateSetting('ragTokenBudget', parseInt(e.target.value) || 4000)}
            style={{ width: 100 }}
          />
        </SettingRow>
        <SettingRow label="Chunk size">
          <input
            type="number"
            className="input-field"
            value={settings.chunkSize}
            onChange={(e) => updateSetting('chunkSize', parseInt(e.target.value) || 700)}
            style={{ width: 100 }}
          />
        </SettingRow>
        <SettingRow label="Overlap">
          <input
            type="number"
            className="input-field"
            value={settings.chunkOverlap}
            onChange={(e) => updateSetting('chunkOverlap', parseFloat(e.target.value) || 0.15)}
            style={{ width: 80 }}
            step={0.05}
            min={0}
            max={0.5}
          />
        </SettingRow>
      </div>

      <RagInfoModal
        open={ragInfoOpen}
        onClose={() => setRagInfoOpen(false)}
        capabilities={capabilities}
        settings={settings}
      />

      <Section title="Modelo">
        <SettingRow label="Temperature">
          <input
            type="number"
            className="input-field"
            value={settings.temperature}
            onChange={(e) => updateSetting('temperature', parseFloat(e.target.value) || 0.7)}
            style={{ width: 80 }}
            step={0.1}
            min={0}
            max={2}
          />
        </SettingRow>
        <SettingRow label="Max tokens">
          <input
            type="number"
            className="input-field"
            value={settings.maxTokens}
            onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value) || 2048)}
            style={{ width: 100 }}
          />
        </SettingRow>
      </Section>

      <Section title="Privacidad">
        <div className="card" style={{ fontSize: '0.875rem' }}>
          <PrivacyRow label="LLM" local />
          <PrivacyRow label="Embeddings" local />
          <PrivacyRow label="RAG" local />
          <PrivacyRow label="Conversaciones" local />
          <PrivacyRow label="Documentos" local />
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Internet: Necesario para descargar el modelo.
          </div>
        </div>
      </Section>

      <Section title="Almacenamiento">
        {usage && (
          <div className="card" style={{ fontSize: '0.875rem' }}>
            <StorageRow label="Modelo" value={usage.models} />
            <StorageRow label="Documentos" value={usage.documents} />
            <StorageRow label="Conversaciones" value={usage.conversations} />
            <StorageRow label="Embeddings" value={usage.embeddings} />
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, fontWeight: 600 }}>
              Total: {formatBytes(usage.total)}
            </div>
          </div>
        )}
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={handleRequestPersistence}>
          {persisted ? '✓ Almacenamiento persistente' : 'Solicitar persistencia'}
        </button>
      </Section>

      <Section title="Datos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            Exportar backup
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Importar backup
          </button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn btn-danger" onClick={handleClearAll}>
            Eliminar todos los datos
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-secondary)' }}>{title}</h2>
      {children}
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.875rem' }}>{label}</span>
      {children}
    </div>
  )
}

function PrivacyRow({ label, local }: { label: string; local: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
      <span>{label}</span>
      <span style={{ color: local ? 'var(--success)' : 'var(--warning)' }}>
        {local ? '✓ Local' : 'Internet'}
      </span>
    </div>
  )
}

function StorageRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span>{formatBytes(value)}</span>
    </div>
  )
}
