import { NavLink } from 'react-router-dom'
import HelpButton from './HelpButton'
import './Layout.css'

const navItems = [
  { to: '/', label: 'Today' },
  { to: '/menu', label: 'Menu' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/changes', label: 'Changes' },
] as const

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <HelpButton />
      <main className="layout-main">{children}</main>
      <nav className="bottom-nav" role="navigation">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
