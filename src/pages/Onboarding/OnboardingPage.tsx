import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { detectDeviceCapabilities, getRecommendedModelId, isModelCompatible } from '../../utils/device'
import { applyDeviceOptimizedSettings } from '../../utils/deviceSettings'
import { getModelInfo } from '../../services/llm/models'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { formatBytes } from '../../utils/helpers'
import type { DeviceCapabilities } from '../../types'
import './Onboarding.css'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [recommendedModelId, setRecommendedModelId] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    void applyDeviceOptimizedSettings()
    detectDeviceCapabilities().then((caps) => {
      setCapabilities(caps)
      setRecommendedModelId(getRecommendedModelId(caps))
    })
  }, [])

  const modelInfo = getModelInfo(recommendedModelId)
  const compatibility = capabilities
    ? isModelCompatible(recommendedModelId, capabilities)
    : { compatible: false, reason: 'Comprobando compatibilidad...' }

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      await applyDeviceOptimizedSettings()
      const llm = getLLMService()
      await llm.loadModel(recommendedModelId, (p) => setProgress(p))
      await settingsRepo.update({
        activeModelId: recommendedModelId,
        onboardingComplete: true,
      })
      setInstalled(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el modelo')
    } finally {
      setDownloading(false)
    }
  }

  async function handleSkipToModels() {
    await settingsRepo.update({ onboardingComplete: true })
    navigate('/app/models')
  }

  async function handleSkipToChat() {
    await settingsRepo.update({ onboardingComplete: true })
    navigate('/app/chat')
  }

  function handleFinish() {
    navigate('/app/chat')
  }

  if (installed) {
    return (
      <div className="onboarding">
        <div className="onboarding-step">
          <h2>Modelo instalado</h2>
          <p>Tu IA local está lista para conversar.</p>
          <div className="onboarding-actions">
            <button className="btn btn-primary" onClick={handleFinish}>
              Ir al chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      <div className="onboarding-step">
        <h2>Instalar modelo</h2>
        <p className="onboarding-lead">
          Para usar Veyra necesitas un modelo de IA local. Este es el recomendado para tu dispositivo.
        </p>

        {modelInfo && (
          <div className="model-recommendation">
            <h3>{modelInfo.name}</h3>
            <p className="model-recommendation-summary">{modelInfo.specialtySummary}</p>

            <div className="model-spec">
              <span className="model-spec-label">Tamaño</span>
              <span className="model-spec-value">{formatBytes(modelInfo.sizeBytes)}</span>
            </div>
            <div className="model-spec">
              <span className="model-spec-label">Backend</span>
              <span className="model-spec-value">{modelInfo.backend.toUpperCase()}</span>
            </div>
            <div className="model-spec">
              <span className="model-spec-label">Compatibilidad</span>
              <span
                className={`model-spec-value ${compatibility.compatible ? 'model-spec-ok' : 'model-spec-bad'}`}
              >
                {compatibility.compatible
                  ? 'Compatible con este dispositivo'
                  : compatibility.reason ?? 'No compatible'}
              </span>
            </div>
          </div>
        )}

        {downloading && (
          <div className="onboarding-progress">
            <p>Descargando modelo... {Math.round(progress * 100)}%</p>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {error && <p className="onboarding-error">{error}</p>}

        <div className="onboarding-actions">
          <button
            className="btn btn-primary onboarding-primary-btn"
            onClick={handleDownload}
            disabled={downloading || !compatibility.compatible || !recommendedModelId}
          >
            {downloading ? 'Descargando...' : 'Descargar modelo'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSkipToModels}
            disabled={downloading}
          >
            Ver todos los modelos
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleSkipToChat}
            disabled={downloading}
          >
            Continuar sin modelo
          </button>
        </div>
      </div>
    </div>
  )
}
