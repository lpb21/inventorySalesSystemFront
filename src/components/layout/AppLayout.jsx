import {
  LayoutDashboard, Package, ShoppingCart, Settings, Shield, History,
  Search, BarChart3, LogOut, Eye, User, Menu, Megaphone
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768
  })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const currentPath = location.pathname

  // Superadmin sin tenant propio no puede operar los módulos de negocio (darían 400 en backend)
  const isSuperadminWithoutTenant = currentUser?.role === 'superadmin' && !currentUser?.tenant

  const navItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard, tenantScoped: true },
    { id: 'inventory', path: '/inventory', label: 'Inventario', icon: Package, tenantScoped: true },
    { id: 'sales', path: '/sales', label: 'Punto de Venta', icon: ShoppingCart, tenantScoped: true },
    { id: 'credit-accounts', path: '/credit-accounts', label: 'Cuentas por Cobrar', icon: User, permission: 'canViewCreditAccounts', tenantScoped: true },
    { id: 'reports', path: '/reports', label: 'Reportes', icon: BarChart3, permission: 'canViewFullReports', tenantScoped: true },
    { id: 'settings', path: '/settings', label: 'Configuración', icon: Settings, permission: 'canAccessSettings', tenantScoped: true },
    { id: 'admin', path: '/admin/tenants', label: 'Suscripciones', icon: Shield, permission: 'canManageAllTenants' },
    { id: 'admin-audit', path: '/admin/audit', label: 'Auditoría', icon: History, permission: 'canManageAllTenants' },
    { id: 'admin-announcements', path: '/admin/announcements', label: 'Anuncios', icon: Megaphone, permission: 'canManageAllTenants' },
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

  // Cerrar el drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Bloquear scroll del body y cerrar con Escape cuando el drawer móvil está abierto
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const handleMenuClick = () => {
    if (isMobile) {
      setMobileOpen(prev => !prev)
    } else {
      setIsSidebarCollapsed(prev => !prev)
    }
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img className="logo-icon" src="/LOGOPFGEM.jpeg" alt="Logo Punto Fresco" />
          <div className="sidebar-brand-text">
            <div className="logo-text">Punto Fresco</div>
            <div className="logo-subtitle">Inventarios</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => {
            if (item.permission && !can(currentUser, item.permission)) return null
            const isActive = currentPath === item.path
            const isDisabled = isSuperadminWithoutTenant && item.tenantScoped
            return (
              <button 
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'nav-item-disabled' : ''}`}
                onClick={() => { if (!isDisabled) navigate(item.path) }}
                disabled={isDisabled}
                title={isDisabled ? `${item.label} (no disponible para superadmin sin empresa)` : item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            )
          })}

        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px', flexShrink: 0 }}>
          <button
            className={`nav-item ${isSuperadminWithoutTenant ? 'nav-item-disabled' : ''}`}
            onClick={() => { if (!isSuperadminWithoutTenant) window.open('/customer', '_blank') }}
            disabled={isSuperadminWithoutTenant}
            title={isSuperadminWithoutTenant ? 'Pantalla Cliente (no disponible para superadmin sin empresa)' : 'Pantalla Cliente'}
          >
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
              onClick={handleMenuClick}
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
