import { Link } from 'react-router-dom'
import { HomeIcon } from './HomeIcon'
import { formatAppVersion } from '../../utils/version'

export function AppTopBar() {
  return (
    <header className="app-topbar">
      <Link to="/" className="app-topbar-home" aria-label="Ir al inicio">
        <HomeIcon />
        <span className="app-topbar-home-label">Inicio</span>
      </Link>
      <div className="app-topbar-brand">VEYRA</div>
      <div className="app-topbar-version">{formatAppVersion()}</div>
    </header>
  )
}
