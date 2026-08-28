import { NavLink, Link } from 'react-router-dom'
import { HomeIcon } from './HomeIcon'
import { formatDeploymentVersion, formatBuildDateTime, getCommitUrl, getShortBuildHash } from '../../utils/version'
import '../../styles/layout.css'

const navItems = [
  { to: '/app', label: 'Inicio' },
  { to: '/app/chat', label: 'Chat' },
  { to: '/app/memory', label: 'Memoria' },
  { to: '/app/library', label: 'Biblioteca' },
  { to: '/app/models', label: 'Modelos' },
  { to: '/app/settings', label: 'Configuración' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/app" className="sidebar-home-link" aria-label="Ir al menú">
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
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span>{item.label}</span>
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
