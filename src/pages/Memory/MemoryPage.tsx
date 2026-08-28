import { useState, useEffect } from 'react'
import { conversationRepo } from '../../db/repositories/conversationRepository'
import { documentRepo } from '../../db/repositories/documentRepository'
import { ragService } from '../../services/rag/ragService'
import { formatRelativeTime } from '../../utils/helpers'

export function MemoryPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    documents: 0,
    chunks: 0,
    lastIndexed: Date.now(),
  })

  useEffect(() => {
    async function load() {
      const [convCount, docCount, ragStats] = await Promise.all([
        conversationRepo.count(),
        documentRepo.count(),
        ragService.getStats(),
      ])
      setStats({
        conversations: convCount,
        documents: docCount,
        chunks: ragStats.chunks,
        lastIndexed: Date.now(),
      })
    }
    load()
  }, [])

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Memoria</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        Tu conocimiento personal indexado localmente.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Conversaciones" value={stats.conversations} icon="💬" />
        <StatCard label="Documentos" value={stats.documents} icon="📄" />
        <StatCard label="Fragmentos indexados" value={stats.chunks.toLocaleString()} icon="🧩" />
        <StatCard label="Vectores" value={stats.chunks.toLocaleString()} icon="📊" />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Tu memoria</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Veyra indexa automáticamente tus conversaciones y documentos para poder recuperar
          información relevante cuando la necesites. Todo se almacena localmente en tu dispositivo.
        </p>
        <div style={{ marginTop: 16, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Última indexación: {formatRelativeTime(stats.lastIndexed)}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Cómo funciona</h3>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p>1. Tus conversaciones y documentos se dividen en fragmentos</p>
          <p>2. Cada fragmento se convierte en un vector (embedding)</p>
          <p>3. Cuando preguntas algo, Veyra busca los fragmentos más relevantes</p>
          <p>4. Esa información se usa como contexto para responder</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
