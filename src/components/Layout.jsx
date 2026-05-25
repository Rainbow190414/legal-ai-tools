import { Outlet, useLocation, Link } from 'react-router-dom'
import { Scale, Settings, LayoutGrid } from 'lucide-react'

function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/home' || location.pathname !== '/'

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="header-brand">
            <Scale size={28} />
            <span className="header-title">法律AI工具</span>
          </Link>
          <div className="header-actions">
            {isHome ? (
              <Link to="/" className="header-link" title="新版工作台">
                <LayoutGrid size={18} />
                <span>新版</span>
              </Link>
            ) : (
              <Link to="/home" className="header-link" title="旧版首页">
                <LayoutGrid size={18} />
                <span>旧版</span>
              </Link>
            )}
            <Link to="/settings" className="header-settings" title="设置">
              <Settings size={22} />
            </Link>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <p>法律AI工具 - 基于AI大模型构建</p>
      </footer>
    </div>
  )
}

export default Layout
