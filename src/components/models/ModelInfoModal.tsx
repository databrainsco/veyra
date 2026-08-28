import { useEffect } from 'react'
import type { ModelInfo, DeviceCapabilities } from '../../types'
import { getModelGuide, getVeyraLimitsForModel } from '../../services/models/modelGuides'
import { MODALITY_LABELS } from '../../services/llm/models'
import { CloseIcon } from '../chat/ChatIcons'
import './ModelInfoModal.css'

interface ModelInfoModalProps {
  model: ModelInfo
  capabilities: DeviceCapabilities | null
  open: boolean
  onClose: () => void
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  )
}

export function ModelInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="model-info-btn"
      onClick={onClick}
      aria-label="Ver información del modelo"
      title="Información"
    >
      <InfoIcon />
    </button>
  )
}

export function ModelInfoModal({ model, capabilities, open, onClose }: ModelInfoModalProps) {
  const guide = getModelGuide(model.id)
  const limits = getVeyraLimitsForModel(model, capabilities)

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

  return (
    <div className="model-info-overlay" onClick={onClose} role="presentation">
      <div
        className="model-info-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-info-title"
      >
        <div className="model-info-header">
          <div>
            <h2 id="model-info-title">{model.name}</h2>
            <p className="model-info-provider">{model.provider}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="model-info-body">
          {guide ? (
            <>
              <section className="model-info-section">
                <h3>Qué hace</h3>
                <p>{guide.overview}</p>
              </section>

              <section className="model-info-section">
                <h3>Para qué puedes usarlo</h3>
                <ul>
                  {guide.useCases.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="model-info-section">
                <h3>Qué tipo de información entiende</h3>
                <ul>
                  {guide.knowledgeAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="model-info-section">
                <h3>Limitaciones</h3>
                <ul className="model-info-list-muted">
                  {guide.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="model-info-section">
                <h3>Consejos en Veyra</h3>
                <ul>
                  {guide.tips.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <section className="model-info-section">
              <p>{model.specialtySummary}</p>
            </section>
          )}

          <section className="model-info-section">
            <h3>Modalidades</h3>
            <div className="model-info-tags">
              {model.modalities.supported.map((item) => (
                <span key={item} className="model-info-tag model-info-tag--ok">
                  {MODALITY_LABELS[item]}
                </span>
              ))}
              {model.modalities.notSupported.map((item) => (
                <span key={item} className="model-info-tag model-info-tag--no">
                  Sin {MODALITY_LABELS[item].toLowerCase()}
                </span>
              ))}
            </div>
          </section>

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
              Veyra procesa todo localmente. El modelo responde según su entrenamiento y el contexto
              que le des en el chat; no sustituye buscadores, bases de datos en vivo ni herramientas
              especializadas de auditoría o escaneo.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
