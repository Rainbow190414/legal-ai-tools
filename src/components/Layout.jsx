import { Outlet, Link } from 'react-router-dom'
import { Scale, Settings } from 'lucide-react'

function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="header-brand">
            <Scale size={28} />
            <span className="header-title">法律AI工具</span>
          </Link>
          <Link to="/settings" className="header-settings">
            <Settings size={20} />
          </Link>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        法律AI工具 - 基于Kimi API构建
      </footer>
    </div>
  )
}

export default Layout
