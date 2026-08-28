import { Link } from 'react-router-dom'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { modelRepo } from '../../db/repositories/settingsRepository'
import { getModelInfo } from '../../services/llm/models'
import { useEffect, useState } from 'react'
import './AppMenu.css'

const menuItems = [
  {
    to: '/app/chat',
    title: 'Chat',
    description: 'Conversa con tu IA local',
  },
  {
    to: '/app/memory',
    title: 'Memoria',
    description: 'Busca en conversaciones guardadas',
  },
  {
    to: '/app/library',
    title: 'Biblioteca',
    description: 'Documentos PDF y TXT indexados',
  },
  {
    to: '/app/models',
    title: 'Modelos',
    description: 'Descarga y activa modelos de IA',
  },
  {
    to: '/app/settings',
    title: 'Configuración',
    description: 'Ajustes, RAG y respaldos',
  },
]

export function AppMenuPage() {
  const [activeModelName, setActiveModelName] = useState<string | null>(null)
  const [modelCached, setModelCached] = useState(false)

  useEffect(() => {
    async function load() {
      const settings = await settingsRepo.get()
      if (!settings.activeModelId) {
        setActiveModelName(null)
        setModelCached(false)
        return
      }

      const info = getModelInfo(settings.activeModelId)
      setActiveModelName(info?.name ?? settings.activeModelId)

      const record = await modelRepo.get(settings.activeModelId)
      setModelCached(
        record?.status === 'installed' ||
          record?.status === 'active' ||
          Boolean(record?.installedAt),
      )
    }

    void load()
  }, [])

  return (
    <div className="app-menu">
      <div className="app-menu-header">
        <h1>Menú</h1>
        <p>Elige una sección para continuar.</p>
      </div>

      {activeModelName && (
        <div className="app-menu-model card">
          <div className="app-menu-model-label">Modelo activo</div>
          <div className="app-menu-model-name">{activeModelName}</div>
          <div className="app-menu-model-hint">
            {modelCached
              ? 'Ya descargado. Se activa en memoria al enviar un mensaje en Chat.'
              : 'Descárgalo en Modelos para empezar a chatear.'}
          </div>
        </div>
      )}

      <div className="app-menu-grid">
        {menuItems.map((item) => (
          <Link key={item.to} to={item.to} className="app-menu-card card">
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>

      <Link to="/" className="app-menu-home-link">
        Volver al inicio de Veyra
      </Link>
    </div>
  )
}
