import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import HelpButton from './HelpButton'
import './Layout.css'

function DumbbellIcon() {
  return (
    <svg
      className="nav-icon nav-icon--dumbbell"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="5" cy="12" r="4" />
      <circle cx="19" cy="12" r="4" />
      <rect x="9" y="11" width="6" height="2" />
    </svg>
  )
}

const navItems = [
  { to: '/', label: 'Today', icon: <DumbbellIcon /> },
  { to: '/menu', label: 'Set Menu', icon: '📋' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/changes', label: 'Changes', icon: '📈' },
] as const

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const nav = (
    <nav className="bottom-nav" role="navigation">
      {navItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className={`nav-icon ${typeof icon === 'string' ? 'nav-icon--emoji' : ''}`}>
            {icon}
          </span>
          <span className="nav-text">{label}</span>
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="layout">
      <HelpButton />
      <main className="layout-main">{children}</main>
      {createPortal(nav, document.body)}
    </div>
  )
}
