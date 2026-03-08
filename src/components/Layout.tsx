import { NavLink } from 'react-router-dom'
import './Layout.css'

const navItems = [
  { to: '/', label: "Today's workout", icon: '🏠' },
  { to: '/menu', label: 'Menu setting', icon: '⚙️' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/changes', label: 'Changes', icon: '📈' },
] as const

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <main className="layout-main">{children}</main>
      <nav className="bottom-nav" role="navigation">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
