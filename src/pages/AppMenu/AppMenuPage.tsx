import { Link } from 'react-router-dom'
import { formatDeploymentVersion, formatBuildDateTime } from '../../utils/version'
import './AppMenu.css'

export function AppMenuPage() {
  return (
    <div className="app-menu app-home">
      <div className="app-home-content">
        <h1 className="app-home-logo">VEYRA</h1>
        <p className="app-home-tagline">Your AI. Your memory. Your device.</p>
        <p className="app-home-subtitle">Tu conocimiento permanece contigo.</p>

        <div className="app-home-description">
          <p>
            Conversa con un modelo local, guarda tus chats y conviértelos en memoria consultable.
            Todo en tu dispositivo, sin enviar datos a la nube.
          </p>
        </div>

        <Link to="/app/chat" className="btn btn-primary app-home-cta">
          Ir al chat
        </Link>

        <div className="app-home-version">
          <div>{formatDeploymentVersion()}</div>
          <div>{formatBuildDateTime()}</div>
        </div>
      </div>
    </div>
  )
}
