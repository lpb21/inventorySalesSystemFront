import { 
  LayoutDashboard, Package, ShoppingCart, Settings, 
  Search, BarChart3, RefreshCw, LogOut, Eye, User
} from 'lucide-react'
import { can, ROLE_LABELS } from '../utils/permissions'

/**
 * Layout principal de la aplicación.
 * Contiene sidebar (navegación) y header (búsqueda, usuario).
 *
 * @param {object} props
 * @param {string}   props.currentView     - Vista activa
 * @param {Function} props.setCurrentView  - Cambia la vista activa
 * @param {object}   props.currentUser     - Usuario autenticado
 * @param {string}   props.searchTerm      - Término de búsqueda
 * @param {Function} props.setSearchTerm   - Setter del término de búsqueda
 * @param {number}   props.lowStockCount   - Cantidad de productos con stock bajo
 * @param {Function} props.onRefresh       - Recarga datos
 * @param {Function} props.onLogout        - Cierra sesión
 * @param {React.ReactNode} props.children - Contenido principal
 */
function AppLayout({ currentView, setCurrentView, currentUser, searchTerm, setSearchTerm, lowStockCount, onRefresh, onLogout, children }) {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">iL</div>
          <div>
            <div className="logo-text">invLeo</div>
            <div className="logo-subtitle">Inventarios</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
            <LayoutDashboard />
            Dashboard
          </button>
          <button className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`} onClick={() => setCurrentView('inventory')}>
            <Package />
            Inventario
          </button>
          <button className={`nav-item ${currentView === 'sales' ? 'active' : ''}`} onClick={() => setCurrentView('sales')}>
            <ShoppingCart />
            Punto de Venta
          </button>
          {can(currentUser, 'canViewCreditAccounts') && (
            <button className={`nav-item ${currentView === 'credit-accounts' ? 'active' : ''}`} onClick={() => setCurrentView('credit-accounts')}>
              <User />
              Cuentas por Cobrar
            </button>
          )}
          {can(currentUser, 'canViewFullReports') && (
            <button className={`nav-item ${currentView === 'reports' ? 'active' : ''}`} onClick={() => setCurrentView('reports')}>
              <BarChart3 />
              Reportes
            </button>
          )}

          {can(currentUser, 'canAccessSettings') && (
            <button className={`nav-item ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setCurrentView('settings')}>
              <Settings />
              Configuración
            </button>
          )}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <button className="nav-item" onClick={() => window.open('/customer', '_blank')}>
            <Eye />
            Pantalla Cliente
          </button>
          <button className="nav-item" onClick={onLogout}>
            <LogOut />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">
              {currentView === 'dashboard' && 'Panel Principal'}
              {currentView === 'inventory' && 'Gestión de Inventario'}
              {currentView === 'sales' && 'Punto de Venta'}
              {currentView === 'reports' && 'Reportes'}
              {currentView === 'settings' && 'Configuración'}
              {currentView === 'credit-accounts' && 'Cuentas por Cobrar'}
            </h1>
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
            
            <div className="header-actions">
              <button className="icon-btn" onClick={onRefresh}>
                <RefreshCw />
                {lowStockCount > 0 && (
                  <span className="badge">{lowStockCount}</span>
                )}
              </button>
            </div>
            
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
