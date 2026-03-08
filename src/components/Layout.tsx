import { NavLink } from 'react-router-dom'
import './Layout.css'

const navItems = [
  { to: '/', label: '今日のメニュー', icon: '🏠' },
  { to: '/menu', label: 'メニュー設定', icon: '⚙️' },
  { to: '/calendar', label: 'カレンダー', icon: '📅' },
  { to: '/changes', label: '変化', icon: '📈' },
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
