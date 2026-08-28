import { useEffect } from 'react'
import type { AppSettings, DeviceCapabilities } from '../../types'
import { RAG_GUIDE, getRagLimits } from '../../services/rag/ragGuide'
import { CloseIcon } from '../chat/ChatIcons'
import { ModelInfoButton } from '../models/ModelInfoModal'
import '../models/ModelInfoModal.css'

interface RagInfoModalProps {
  open: boolean
  onClose: () => void
  capabilities: DeviceCapabilities | null
  settings: AppSettings | null
}

export function RagInfoButton({ onClick }: { onClick: () => void }) {
  return <ModelInfoButton onClick={onClick} />
}

export function RagInfoModal({ open, onClose, capabilities, settings }: RagInfoModalProps) {
  const limits = getRagLimits(capabilities, settings)

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sections = [
    RAG_GUIDE.whatToIndex,
    RAG_GUIDE.questionExamples,
    RAG_GUIDE.helpsWith,
    RAG_GUIDE.limitations,
    RAG_GUIDE.tips,
  ]

  return (
    <div className="model-info-overlay" onClick={onClose} role="presentation">
      <div
        className="model-info-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rag-info-title"
      >
        <div className="model-info-header">
          <div>
            <h2 id="rag-info-title">Memoria y RAG</h2>
            <p className="model-info-provider">Recuperación de contexto local</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="model-info-body">
          <section className="model-info-section">
            <h3>Qué es</h3>
            <p>{RAG_GUIDE.overview}</p>
          </section>

          {sections.map((section) => (
            <section key={section.title} className="model-info-section">
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="model-info-section">
            <h3>Alcance en tu dispositivo</h3>
            <dl className="model-info-limits">
              {limits.map((row) => (
                <div key={row.label} className="model-info-limit-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="model-info-section model-info-section--note">
            <p>
              RAG complementa al modelo de chat: busca en tus datos y el modelo redacta la respuesta.
              No añade conocimiento de internet ni garantiza exactitud al 100%; revisa fuentes críticas
              en el documento original.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
