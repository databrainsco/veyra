import { useState, useEffect, useRef } from 'react'
import { documentRepo } from '../../db/repositories/documentRepository'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { processDocument } from '../../services/documents/documentService'
import { detectDeviceCapabilities } from '../../utils/device'
import { RagInfoButton, RagInfoModal } from '../../components/rag/RagInfoModal'
import { formatBytes } from '../../utils/helpers'
import type { Document, AppSettings, DeviceCapabilities } from '../../types'

export function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [ragInfoOpen, setRagInfoOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadDocuments() {
    const docs = await documentRepo.getAll()
    setDocuments(docs)
  }

  useEffect(() => {
    loadDocuments()
    Promise.all([detectDeviceCapabilities(), settingsRepo.get()]).then(([caps, appSettings]) => {
      setCapabilities(caps)
      setSettings(appSettings)
    })
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      try {
        await processDocument(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar documento')
      }
    }

    await loadDocuments()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este documento y sus datos indexados?')) return
    await documentRepo.delete(id)
    await loadDocuments()
  }

  function statusBadge(status: Document['status']) {
    switch (status) {
      case 'indexed': return <span className="badge badge-success">✓ Indexado</span>
      case 'indexing': return <span className="badge badge-warning">Indexando...</span>
      case 'pending': return <span className="badge badge-muted">Pendiente</span>
      case 'error': return <span className="badge badge-error">Error</span>
    }
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Biblioteca</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Sube PDF o TXT para que el RAG los use en el chat
            </p>
          </div>
          <RagInfoButton onClick={() => setRagInfoOpen(true)} />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Procesando...' : '+ Agregar documento'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(255,71,87,0.1)', borderRadius: 8, marginBottom: 16, color: 'var(--error)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>📚</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            No hay documentos todavía
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
            Agrega archivos PDF o TXT para que Veyra pueda buscar en ellos al chatear.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => setRagInfoOpen(true)}>
            Ver ejemplos y alcance del RAG
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map((doc) => (
            <div key={doc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{doc.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {formatBytes(doc.size)}
                  {doc.pageCount ? ` · ${doc.pageCount} páginas` : ''}
                </div>
                {doc.errorMessage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 4 }}>
                    {doc.errorMessage}
                  </div>
                )}
              </div>
              {statusBadge(doc.status)}
              <button className="btn btn-ghost" onClick={() => handleDelete(doc.id)} title="Eliminar">
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <RagInfoModal
        open={ragInfoOpen}
        onClose={() => setRagInfoOpen(false)}
        capabilities={capabilities}
        settings={settings}
      />
    </div>
  )
}
