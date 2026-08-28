import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { detectDeviceCapabilities, getRecommendedModelId, isModelCompatible } from '../../utils/device'
import { getModelInfo } from '../../services/llm/models'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { formatBytes } from '../../utils/helpers'
import type { DeviceCapabilities } from '../../types'
import './Onboarding.css'

const STEPS = [
  {
    title: 'Bienvenido a Veyra.',
    text: 'Tu IA personal vive en tu dispositivo.',
  },
  {
    title: 'Memoria personal',
    text: 'Veyra puede recordar tus conversaciones y aprender de tus documentos.',
  },
  {
    title: 'Instalar un modelo',
    text: 'Primero necesitamos instalar un modelo de IA local.',
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [recommendedModelId, setRecommendedModelId] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    detectDeviceCapabilities().then((caps) => {
      setCapabilities(caps)
      setRecommendedModelId(getRecommendedModelId(caps))
    })
  }, [])

  const modelInfo = getModelInfo(recommendedModelId)
  const compatibility = capabilities
    ? isModelCompatible(recommendedModelId, capabilities)
    : { compatible: true }

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
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

  function handleFinish() {
    navigate('/app/chat')
  }

  if (installed) {
    return (
      <div className="onboarding">
        <div className="onboarding-step">
          <h2>Modelo instalado ✓</h2>
          <p>Tu IA local está lista para conversar.</p>
          <button className="btn btn-primary" onClick={handleFinish}>
            Comenzar a conversar
          </button>
        </div>
      </div>
    )
  }

  if (step < STEPS.length) {
    const current = STEPS[step]!
    return (
      <div className="onboarding">
        <div className="onboarding-step">
          <h2>{current.title}</h2>
          <p>{current.text}</p>
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
          >
            Continuar
          </button>
          <div className="onboarding-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
            ))}
            <div className={`onboarding-dot ${step === STEPS.length ? 'active' : ''}`} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      <div className="onboarding-step" style={{ maxWidth: 520 }}>
        <h2>Modelo recomendado</h2>

        {modelInfo && (
          <div className="model-recommendation">
            <h3>{modelInfo.name}</h3>
            <div className="model-spec">
              <span className="model-spec-label">Tamaño</span>
              <span>{formatBytes(modelInfo.sizeBytes)}</span>
            </div>
            <div className="model-spec">
              <span className="model-spec-label">Cuantización</span>
              <span>{modelInfo.quantization}</span>
            </div>
            <div className="model-spec">
              <span className="model-spec-label">Contexto</span>
              <span>{modelInfo.contextLength.toLocaleString()}</span>
            </div>
            <div className="model-spec">
              <span className="model-spec-label">Backend</span>
              <span>{modelInfo.backend.toUpperCase()}</span>
            </div>
            <div className="model-spec">
              <span className="model-spec-label">Compatibilidad</span>
              <span style={{ color: compatibility.compatible ? 'var(--success)' : 'var(--error)' }}>
                {compatibility.compatible
                  ? '✓ Este dispositivo parece compatible'
                  : `✗ ${compatibility.reason}`}
              </span>
            </div>
          </div>
        )}

        {downloading && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ marginBottom: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Descargando modelo... {Math.round(progress * 100)}%
            </p>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--error)', marginBottom: 16, fontSize: '0.875rem' }}>{error}</p>
        )}

        <button
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading || !compatibility.compatible}
        >
          {downloading ? 'Descargando...' : 'Descargar modelo'}
        </button>

        <button
          className="btn btn-ghost"
          style={{ marginTop: 12 }}
          onClick={() => navigate('/app/models')}
        >
          Ver todos los modelos
        </button>
      </div>
    </div>
  )
}
