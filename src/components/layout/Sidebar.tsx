import { NavLink, Link } from 'react-router-dom'
import { HomeIcon } from './HomeIcon'
import { formatAppVersion, getBuildHash, getRepoUrl } from '../../utils/version'
import '../../styles/layout.css'

const navItems = [
  { to: '/app/chat', label: 'Chat', icon: '💬' },
  { to: '/app/memory', label: 'Memoria', icon: '🧠' },
  { to: '/app/library', label: 'Biblioteca', icon: '📚' },
  { to: '/app/models', label: 'Modelos', icon: '⚡' },
  { to: '/app/settings', label: 'Configuración', icon: '⚙️' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-home-link" aria-label="Ir al inicio">
          <HomeIcon />
        </Link>
        <Link to="/" className="sidebar-logo">VEYRA</Link>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
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
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function FooterVersion() {
  const hash = getBuildHash()
  const repoUrl = getRepoUrl()

  return (
    <div className="footer-version">
      {formatAppVersion()} ·{' '}
      <a href={`${repoUrl}/commit/${hash}`} target="_blank" rel="noopener noreferrer">
        {hash.slice(0, 7)}
      </a>
    </div>
  )
}
