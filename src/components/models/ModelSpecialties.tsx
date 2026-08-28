import type { ModelInfo } from '../../types'
import { MODALITY_LABELS } from '../../services/llm/models'
import './ModelSpecialties.css'

interface ModelSpecialtiesProps {
  model: ModelInfo
  compact?: boolean
}

export function ModelSpecialties({ model, compact = false }: ModelSpecialtiesProps) {
  return (
    <div className={`model-specialties ${compact ? 'model-specialties--compact' : ''}`}>
      <p className="model-specialties-summary">{model.specialtySummary}</p>

      <div className="model-specialties-section">
        <span className="model-specialties-label">Especialidades</span>
        <div className="model-specialties-tags">
          {model.specialties.map((item) => (
            <span key={item} className="model-specialty-tag model-specialty-tag--strength">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="model-specialties-section">
        <span className="model-specialties-label">Modalidades</span>
        <div className="model-specialties-tags">
          {model.modalities.supported.map((item) => (
            <span key={item} className="model-specialty-tag model-specialty-tag--supported">
              ✓ {MODALITY_LABELS[item]}
            </span>
          ))}
          {model.modalities.notSupported.map((item) => (
            <span key={item} className="model-specialty-tag model-specialty-tag--unsupported">
              ✗ {MODALITY_LABELS[item]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
