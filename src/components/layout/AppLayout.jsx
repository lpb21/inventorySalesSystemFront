import { 
  LayoutDashboard, Package, ShoppingCart, Settings, 
  Search, BarChart3, LogOut, Eye, User, Menu
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { can, ROLE_LABELS } from '../../utils/permissions'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'invah_sidebar_collapsed'

/**
 * Layout principal de la aplicación.
 * Contiene sidebar (navegación) y header (búsqueda, usuario).
 */
function AppLayout({ currentUser, searchTerm, setSearchTerm, lowStockCount, onRefresh, onLogout, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch (error) {
      return false
    }
  })
  
  const currentPath = location.pathname

  const navItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', path: '/inventory', label: 'Inventario', icon: Package },
    { id: 'sales', path: '/sales', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'credit-accounts', path: '/credit-accounts', label: 'Cuentas por Cobrar', icon: User, permission: 'canViewCreditAccounts' },
    { id: 'reports', path: '/reports', label: 'Reportes', icon: BarChart3, permission: 'canViewFullReports' },
    { id: 'settings', path: '/settings', label: 'Configuración', icon: Settings, permission: 'canAccessSettings' },
  ]

  const getTitle = () => {
    switch (currentPath) {
      case '/': return 'Panel Principal'
      case '/inventory': return 'Gestión de Inventario'
      case '/sales': return 'Punto de Venta'
      case '/reports': return 'Reportes'
      case '/settings': return 'Configuración'
      case '/credit-accounts': return 'Cuentas por Cobrar'
      default: return 'Panel Principal'
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed))
    } catch (error) {
      // Ignore storage errors to avoid breaking layout behavior.
    }
  }, [isSidebarCollapsed])

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">iL</div>
          <div className="sidebar-brand-text">
            <div className="logo-text">invah</div>
            <div className="logo-subtitle">Inventarios</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => {
            if (item.permission && !can(currentUser, item.permission)) return null
            const isActive = currentPath === item.path
            return (
              <button 
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`} 
                onClick={() => navigate(item.path)}
                title={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <button className="nav-item" onClick={() => window.open('/customer', '_blank')} title="Pantalla Cliente">
            <Eye />
            <span>Pantalla Cliente</span>
          </button>
          <button className="nav-item" onClick={onLogout} title="Cerrar Sesión">
            <LogOut />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button
              className="icon-btn sidebar-toggle-btn"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              title={isSidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              aria-label={isSidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            >
              <Menu />
            </button>
            <h1 className="header-title">{getTitle()}</h1>
          </div>
          
          <div className="header-right">
            <div className="search-box">
              <Search />
              <input 
                type="text" 
                placeholder="Buscar productos... (Ctrl+K)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* <div className="header-actions">
              <button className="icon-btn" onClick={onRefresh}>
                <RefreshCw />
                {lowStockCount > 0 && (
                  <span className="badge">{lowStockCount}</span>
                )}
              </button>
            </div> */}
            
            <div className="user-menu">
              <div className="user-avatar">
                {currentUser?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'US'}
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser?.name || 'Usuario'}</span>
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  color: ROLE_LABELS[currentUser?.role]?.color || 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {ROLE_LABELS[currentUser?.role]?.label || currentUser?.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppLayout
