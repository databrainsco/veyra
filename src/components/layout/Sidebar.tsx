import { NavLink, Link } from 'react-router-dom'
import { HomeIcon } from './HomeIcon'
import {
  NavHomeIcon,
  NavChatIcon,
  NavMemoryIcon,
  NavLibraryIcon,
  NavModelsIcon,
  NavSettingsIcon,
} from './NavIcons'
import { formatDeploymentVersion, formatBuildDateTime, getCommitUrl, getShortBuildHash } from '../../utils/version'
import '../../styles/layout.css'

const navItems = [
  { to: '/app', label: 'Inicio', Icon: NavHomeIcon },
  { to: '/app/chat', label: 'Chat', Icon: NavChatIcon },
  { to: '/app/memory', label: 'Memoria', Icon: NavMemoryIcon },
  { to: '/app/library', label: 'Biblioteca', Icon: NavLibraryIcon },
  { to: '/app/models', label: 'Modelos', Icon: NavModelsIcon },
  { to: '/app/settings', label: 'Configuración', Icon: NavSettingsIcon },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/app" className="sidebar-home-link" aria-label="Ir al inicio">
          <HomeIcon />
        </Link>
        <Link to="/app" className="sidebar-logo">VEYRA</Link>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <FooterVersion />
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Navegación principal">
      <div className="mobile-nav-items">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            title={item.label}
          >
            <item.Icon />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function FooterVersion() {
  const hash = getShortBuildHash()
  const repoUrl = getCommitUrl()

  return (
    <div className="footer-version">
      {formatDeploymentVersion()}
      {hash !== 'dev' && (
        <>
          {' · '}
          <a href={repoUrl} target="_blank" rel="noopener noreferrer">
            {hash}
          </a>
        </>
      )}
      <div style={{ marginTop: 4, fontSize: '0.6875rem' }}>{formatBuildDateTime()}</div>
    </div>
  )
}
