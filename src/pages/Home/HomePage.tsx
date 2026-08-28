import { useNavigate } from 'react-router-dom'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { formatDeploymentVersion, formatBuildDateTime } from '../../utils/version'
import './Home.css'

export function HomePage() {
  const navigate = useNavigate()

  async function handleStart() {
    const settings = await settingsRepo.get()
    if (!settings.onboardingComplete) {
      navigate('/onboarding')
    } else {
      navigate('/app/chat')
    }
  }

  return (
    <div className="home">
      <div className="home-bg" />
      <div className="home-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      <div className="home-content">
        <h1 className="home-logo">VEYRA</h1>
        <p className="home-tagline">Your AI. Your memory. Your device.</p>
        <p className="home-subtitle">Tu conocimiento permanece contigo.</p>

        <div className="home-description">
          <p>
            Veyra es tu IA personal que vive en tu dispositivo. Conversa con un modelo local,
            guarda tus conversaciones y conviértelas en memoria consultable.
          </p>
          <p>
            Carga documentos PDF y TXT, indexa tu conocimiento con RAG y recupera información
            semanas o meses después — todo sin enviar tus datos a la nube.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleStart} style={{ minWidth: 180 }}>
          Comenzar
        </button>

        <div className="home-privacy">
          <span>🔒</span>
          <span>Procesamiento local</span>
        </div>

        <div className="home-version">
          <div>{formatDeploymentVersion()}</div>
          <div className="home-version-date">{formatBuildDateTime()}</div>
        </div>
      </div>
    </div>
  )
}
