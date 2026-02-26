import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, 
  TrendingUp, AlertTriangle, Search, Bell, 
  Plus, Minus, Trash2, Printer, Save, Edit, DollarSign,
  ChevronRight, Package2, Milk, Beef, Drumstick, Scale,
  ArrowUp, ArrowDown, Eye, BarChart3, History, LogOut,
  RefreshCw, Download, Upload, X, Check, User, Users, Lock, Building
} from 'lucide-react'
import Login from './Login'
import { 
  productsAPI, categoriesAPI, salesAPI, reportsAPI, 
  inventoryAPI, authAPI, usersAPI, tenantAPI, getToken, getUser, setUser, clearSession
} from './api/config'

// Sistema de permisos
const PERMISSIONS = {
  cashier:    { canEditProducts: false, canDeleteProducts: false, canManageCategories: false, canDiscount: false, canViewFullReports: false, canViewCosts: false, canAccessSettings: false, canManageUsers: false },
  supervisor: { canEditProducts: true,  canDeleteProducts: false, canManageCategories: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: false, canManageUsers: false },
  admin:      { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true },
  owner:      { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true },
  superadmin: { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canManageAllTenants: true },
}

const ROLE_LABELS = {
  cashier:    { label: 'Cajero',      color: '#e94560' },
  supervisor: { label: 'Supervisor',  color: '#ffc107' },
  admin:      { label: 'Administrador', color: '#00d9a5' },
  owner:      { label: 'Propietario', color: '#3b82f6' },
  superadmin: { label: 'Super Admin', color: '#8b5cf6' },
}

function can(user, permission) {
  if (!user) return false
  return PERMISSIONS[user.role]?.[permission] ?? false
}

// Componente principal
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(false)
  const [toasts, setToasts] = useState([])
  const [posKey, setPosKey] = useState(0)
  const [sales, setSales] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [loading, setLoading] = useState(false)
  const [completingSale, setCompletingSale] = useState(false)
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' })
  
  // Estados para gestión de usuarios
  const [users, setUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  // Datos del dashboard
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayProfit: 0,
    lowStockCount: 0,
    totalProducts: 0
  })

  // 1) Validar sesión con el backend al montar la app
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setAuthChecked(true)
      return
    }
    authAPI.me()
      .then(response => {
        const user = response.data || response
        setUser(user)
        setCurrentUser(user)
        setIsLoggedIn(true)
        localStorage.setItem('invleo_logged_in', 'true')
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => setAuthChecked(true))
  }, [])

  // 2) Cargar datos solo después de confirmar la sesión con el backend
  useEffect(() => {
    if (authChecked && isLoggedIn && currentUser) {
      loadInitialData()
    }
  }, [authChecked, isLoggedIn])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const loadFunctions = [
        loadProducts(),
        loadCategories(),
        loadSales(),
        loadDashboard()
      ]
      // Cargar usuarios si tiene permiso
      if (can(currentUser, 'canManageUsers')) {
        loadFunctions.push(loadUsers())
      }
      await Promise.all(loadFunctions)
    } catch (error) {
      console.error('Error cargando datos:', error)
      addToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 })
      let productsData = response.data ?? response
      if (!Array.isArray(productsData)) {
        productsData = productsData.products || productsData.items || []
      }
      setProducts(Array.isArray(productsData) ? productsData : [])
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProducts([])
    }
  }

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll()
      let list = response.data ?? response
      if (!Array.isArray(list)) {
        list = list.categories || list.items || list.data || []
      }
      setCategories(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
      setCategories([])
    }
  }

  const loadSales = async () => {
    try {
      const response = await salesAPI.getAll()
      let list = response.data ?? response
      if (!Array.isArray(list)) {
        list = list.sales || list.items || []
      }
      setSales(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error cargando ventas:', error)
      setSales([])
    }
  }

  const loadDashboard = async () => {
    try {
      const response = await reportsAPI.getDashboard()
      const d = response.data || response
      setDashboardData({
        todaySales:    Number(d.todaySales)    || 0,
        todayProfit:   Number(d.todayProfit)   || 0,
        lowStockCount: Number(d.lowStockCount) || 0,
        totalProducts: Number(d.totalProducts) || 0
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll()
      let usersData = response.data ?? response
      if (!Array.isArray(usersData)) {
        usersData = usersData.users || usersData.items || []
      }
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      setUsers([])
    }
  }

  // Guardar usuario (crear nuevo)
  const saveUser = async (userData) => {
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, userData)
        addToast('Usuario actualizado exitosamente', 'success')
      } else {
        await usersAPI.create(userData)
        addToast('Usuario creado exitosamente', 'success')
      }
      setShowUserModal(false)
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      const errorMessage = error?.message || 'Error al guardar usuario'
      addToast(errorMessage, 'error')
    }
  }

  // Eliminar usuario
  const deleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return
    }
    try {
      await usersAPI.delete(userId)
      addToast('Usuario eliminado exitosamente', 'success')
      await loadUsers()
    } catch (error) {
      const errorMessage = error?.message || 'Error al eliminar usuario'
      addToast(errorMessage, 'error')
    }
  }

  // Editar usuario (abrir modal)
  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowUserModal(true)
  }

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || product.category_id === selectedCategory || product.category?.name === selectedCategory
    return matchesSearch && matchesCategory && product.is_active !== false
  })

  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0))

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    addToast(`${product.name} agregado al carrito`)
  }

  const updateCartQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0)

  const completeSale = async () => {
    if (cart.length === 0) return
    
    setCompletingSale(true)
    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        })),
        subtotal: cartTotal,
        discount: 0,
        total: cartTotal,
        payment_method: 'cash',
        amount_received: cartTotal,
        change_given: 0
      }
      
      await salesAPI.create(saleData)
      
      setCart([])
      setPosKey(posKey + 1)
      addToast('Venta completada exitosamente!', 'success')
      
      await Promise.all([loadProducts(), loadSales(), loadDashboard()])
    } catch (error) {
      addToast('Error al completar venta', 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  const saveProduct = async (product) => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, product)
        addToast('Producto actualizado', 'success')
      } else {
        await productsAPI.create(product)
        addToast('Producto creado', 'success')
      }
      setShowProductModal(false)
      setEditingProduct(null)
      await loadProducts()
    } catch (error) {
      addToast('Error al guardar producto', 'error')
    }
  }

  const deleteProduct = async (id) => {
    try {
      await productsAPI.delete(id)
      addToast('Producto eliminado', 'warning')
      await loadProducts()
    } catch (error) {
      addToast('Error al eliminar producto', 'error')
    }
  }

  const todaySales = sales
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.total || 0), 0)

  // Funciones de login/logout
  const handleLogin = (user) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
    localStorage.setItem('invleo_logged_in', 'true')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setProducts([])
    setCategories([])
    setSales([])
    setUsers([])
    setDashboardData({ todaySales: 0, todayProfit: 0, lowStockCount: 0, totalProducts: 0 })
    clearSession()
  }

  // Mientras se valida la sesión con el backend, mostrar spinner
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary, #0d1117)',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid var(--border, #30363d)',
          borderTopColor: 'var(--accent, #e94560)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: 'var(--text-secondary, #8b949e)', fontSize: '14px' }}>
          Verificando sesión...
        </span>
      </div>
    )
  }

  // Si no está logueado, mostrar pantalla de login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">iL</div>
            <div>
              <div className="logo-text">invLeo</div>
              <div className="logo-subtitle">Inventarios</div>
            </div>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <LayoutDashboard />
              Dashboard
            </button>
            <button 
              className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`}
              onClick={() => setCurrentView('inventory')}
            >
              <Package />
              Inventario
            </button>
            <button 
              className={`nav-item ${currentView === 'sales' ? 'active' : ''}`}
              onClick={() => setCurrentView('sales')}
            >
              <ShoppingCart />
              Punto de Venta
            </button>
            <button 
              className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
              onClick={() => setCurrentView('reports')}
            >
              <BarChart3 />
              Reportes
            </button>
            {can(currentUser, 'canAccessSettings') && (
              <button 
                className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentView('settings')}
              >
                <Settings />
                Configuración
              </button>
            )}
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button 
              className="nav-item"
              onClick={() => window.open('/customer', '_blank')}
            >
              <Eye />
              Pantalla Cliente
            </button>
            <button className="nav-item" onClick={handleLogout}>
              <LogOut />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <header className="header">
            <div className="header-left">
              <h1 className="header-title">
                {currentView === 'dashboard' && 'Panel Principal'}
                {currentView === 'inventory' && 'Gestión de Inventario'}
                {currentView === 'sales' && 'Punto de Venta'}
                {currentView === 'reports' && 'Reportes'}
                {currentView === 'settings' && 'Configuración'}
              </h1>
            </div>
            
            <div className="header-right">
              <div className="search-box">
                <Search />
                <input 
                  type="text" 
                  placeholder="Buscar productos... (Ctrl+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="header-actions">
                <button className="icon-btn" onClick={loadInitialData}>
                  <RefreshCw />
                  {lowStockProducts.length > 0 && (
                    <span className="badge">{lowStockProducts.length}</span>
                  )}
                </button>
              </div>
              
              <div className="user-menu">
                <div className="user-avatar">
                  {currentUser?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'US'}
                </div>
                <div className="user-info">
                  <span className="user-name">{currentUser?.name || 'Usuario'}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: ROLE_LABELS[currentUser?.role]?.color || 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {ROLE_LABELS[currentUser?.role]?.label || currentUser?.role}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="content-area">
            {currentView === 'dashboard' && (
              <DashboardView 
                products={products}
                sales={sales}
                todaySales={dashboardData.todaySales}
                todayProfit={dashboardData.todayProfit}
                lowStockProducts={lowStockProducts}
                onNavigate={setCurrentView}
                loading={loading}
              />
            )}
            
            {currentView === 'inventory' && (
              <InventoryView 
                products={products}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onAddProduct={() => { setEditingProduct(null); setShowProductModal(true) }}
                onEditProduct={(p) => { setEditingProduct(p); setShowProductModal(true) }}
                onDeleteProduct={deleteProduct}
                searchTerm={searchTerm}
                onAddCategory={() => setShowCategoryModal(true)}
                currentUser={currentUser}
              />
            )}
            
            {currentView === 'sales' && (
              <SalesView
                key={posKey}
                products={filteredProducts}
                cart={cart}
                onAddToCart={addToCart}
                onUpdateQuantity={updateCartQuantity}
                onRemoveItem={removeFromCart}
                onCompleteSale={completeSale}
                cartTotal={cartTotal}
                categories={categories}
                completingSale={completingSale}
              />
            )}
            
            {currentView === 'reports' && (
              <ReportsView sales={sales} products={products} currentUser={currentUser} />
            )}
            
            {currentView === 'settings' && (
              <SettingsView
                categories={categories}
                onDeleteCategory={async (cat) => {
                  try {
                    await categoriesAPI.delete(cat.id)
                    addToast('Categoría eliminada', 'warning')
                    await loadCategories()
                  } catch (error) {
                    const errorData = error?.response?.data
                    const errorMessage = errorData?.error?.message || errorData?.message || error?.message || 'Error al eliminar categoría'
                    addToast(errorMessage, 'error')
                  }
                }}
                onAddCategory={() => setShowCategoryModal(true)}
                currentUser={currentUser}
                users={users}
                onAddUser={() => { setEditingUser(null); setShowUserModal(true) }}
                onEditUser={handleEditUser}
                onDeleteUser={deleteUser}
              />
            )}
          </div>
        </main>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal 
          product={editingProduct}
          categories={categories}
          onSave={saveProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(null) }}
          onAddCategory={() => setShowCategoryModal(true)}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nueva Categoría</h3>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre de la Categoría</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej: Bebidas, Congelados, etc."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={async () => {
                if (newCategoryName.trim()) {
                  try {
                    await categoriesAPI.create({ name: newCategoryName.trim() })
                    addToast('Categoría creada', 'success')
                    setNewCategoryName('')
                    setShowCategoryModal(false)
                    await loadCategories()
                  } catch (error) {
                    addToast('Error al crear categoría', 'error')
                  }
                }
              }}>
                <Save size={18} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal 
          user={editingUser}
          onSave={saveUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null) }}
        />
      )}

      {/* Customer Display */}
      {showCustomerDisplay && (
        <CustomerDisplay
          products={products.filter(p => p.is_active !== false)}
          cart={cart}
          cartTotal={cartTotal}
          onClose={() => setShowCustomerDisplay(false)}
        />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && <Check size={20} />}
            {toast.type === 'warning' && <AlertTriangle size={20} />}
            {toast.type === 'error' && <X size={20} />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Alert Modal */}
      {alertModal.show && (
        <div className="alert-modal-overlay" onClick={() => setAlertModal({ show: false, title: '', message: '' })}>
          <div className="alert-modal" onClick={e => e.stopPropagation()}>
            <div className="alert-modal-header">
              <div className="alert-icon">
                <AlertTriangle size={28} />
              </div>
              <h3 className="alert-modal-title">{alertModal.title}</h3>
            </div>
            <div className="alert-modal-body">
              <p className="alert-message">{alertModal.message}</p>
            </div>
            <div className="alert-modal-footer">
              <button className="btn btn-primary" onClick={() => setAlertModal({ show: false, title: '', message: '' })}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Dashboard View
function DashboardView({ products, sales, todaySales, todayProfit, lowStockProducts, onNavigate, loading }) {
  const totalProducts = products.length
  const localLowStock = products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0)).length
  
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon primary">
            <TrendingUp />
          </div>
          <div className="stat-value">${(todaySales || 0).toLocaleString()}</div>
          <div className="stat-label">Ventas de Hoy</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon success">
            <DollarSign />
          </div>
          <div className="stat-value">${(todayProfit || 0).toLocaleString()}</div>
          <div className="stat-label">Ganancia de Hoy</div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon warning">
            <Package />
          </div>
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-label">Productos Activos</div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon info">
            <AlertTriangle />
          </div>
          <div className="stat-value">{localLowStock}</div>
          <div className="stat-label">Stock Bajo</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos con Stock Bajo</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('inventory')}>
              Ver Todos
            </button>
          </div>
          {localLowStock === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Package size={48} />
              <h4>Todo en orden</h4>
              <p>No hay productos con stock bajo</p>
            </div>
          ) : (
            <div>
              {products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0)).slice(0, 5).map(product => (
                <div key={product.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{product.category?.name || product.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{product.stock} {product.unit}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mín: {product.min_stock || product.minStock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventas Recientes</h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {sales.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <History size={48} />
                <h4>Sin ventas aún</h4>
                <p>Las ventas aparecerán aquí</p>
              </div>
            ) : (
              sales.slice(0, 10).map(sale => (
                <div 
                  key={sale.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Venta #{sale.ticket_number || sale.id?.slice(-6)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(sale.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      ${(sale.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions" style={{ marginTop: '24px' }}>
        <div className="action-card" onClick={() => onNavigate('sales')}>
          <div className="action-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>
            <ShoppingCart />
          </div>
          <div className="action-content">
            <h4>Nueva Venta</h4>
            <p>Iniciar punto de venta (F2)</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="action-card" onClick={() => onNavigate('inventory')}>
          <div className="action-icon" style={{ background: 'rgba(0, 217, 165, 0.15)', color: 'var(--success)' }}>
            <Package />
          </div>
          <div className="action-content">
            <h4>Gestionar Inventario</h4>
            <p>Agregar o editar productos (F3)</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="action-card" onClick={() => onNavigate('reports')}>
          <div className="action-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <BarChart3 />
          </div>
          <div className="action-content">
            <h4>Ver Reportes</h4>
            <p>Estadísticas y análisis</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    </div>
  )
}

// Inventory View
function InventoryView({ products, categories, selectedCategory, onCategoryChange, onAddProduct, onEditProduct, onDeleteProduct, searchTerm, onAddCategory, currentUser }) {
  const canEdit   = can(currentUser, 'canEditProducts')
  const canDelete = can(currentUser, 'canDeleteProducts')
  const canManageCats = can(currentUser, 'canManageCategories')

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || p.category_id === selectedCategory || p.category?.name === selectedCategory
    return matchesSearch && matchesCategory
  })

  const allCategories = ['Todos', ...categories.map(c => c.name)]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="category-tabs">
          {allCategories.map(cat => (
            <button 
              key={cat}
              className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
          {canManageCats && (
            <button className="category-tab" style={{ border: '1px dashed var(--border)' }} onClick={onAddCategory}>
              <Plus size={14} /> Nueva
            </button>
          )}
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={onAddProduct}>
            <Plus size={18} />
            Nuevo Producto
          </button>
        )}
      </div>

      <div className="product-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              {product.category?.name === 'Pollo' && <Drumstick size={48} />}
              {product.category?.name === 'Quesos' && <Milk size={48} />}
              {(product.category?.name === 'Carnes Frías' || product.category?.name === 'Embutidos') && <Beef size={48} />}
              {!['Pollo', 'Quesos', 'Carnes Frías', 'Embutidos'].includes(product.category?.name) && <Package2 size={48} />}
            </div>
            <div className="product-name">{product.name}</div>
            <div className="product-category">{product.category?.name || product.category}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="product-price">${(product.price || 0).toLocaleString()}/{product.unit}</div>
              <div className={`product-stock ${(product.stock || 0) <= (product.min_stock || product.minStock || 0) ? 'stock-low' : 'stock-ok'}`}>
                Stock: {product.stock} {product.unit}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {canEdit && (
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onEditProduct(product)}>
                    <Edit size={14} /> Editar
                  </button>
                )}
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeleteProduct(product.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Sales View (POS)
function SalesView({ products, cart, onAddToCart, onUpdateQuantity, onRemoveItem, onCompleteSale, cartTotal, categories, completingSale }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showPayment, setShowPayment] = useState(false)

  const filteredProducts = products.filter(p =>
    selectedCategory === 'Todos' || p.category?.name === selectedCategory || p.category === selectedCategory
  )

  const change = (paymentAmount && parseInt(paymentAmount) >= cartTotal) ? parseInt(paymentAmount) - cartTotal : 0

  return (
    <div className="pos-container">
      <div className="pos-products">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Productos</h3>
          <div className="category-tabs" style={{ marginBottom: 0 }}>
            {['Todos', ...categories.map(c => c.name)].map(cat => (
              <button 
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="product-card"
              onClick={() => onAddToCart(product)}
              style={{ cursor: 'pointer' }}
            >
              <div className="product-image" style={{ height: '100px' }}>
                {product.category?.name === 'Pollo' && <Drumstick size={36} />}
                {product.category?.name === 'Quesos' && <Milk size={36} />}
                {(product.category?.name === 'Carnes Frías' || product.category?.name === 'Embutidos') && <Beef size={36} />}
              </div>
              <div className="product-name" style={{ fontSize: '14px' }}>{product.name}</div>
              <div className="product-price" style={{ fontSize: '18px' }}>
                ${(product.price || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: (product.stock || 0) <= (product.min_stock || product.minStock || 0) ? 'var(--danger)' : 'var(--text-secondary)' }}>
                Stock: {product.stock} {product.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pos-cart">
        <div className="cart-header">
          <h3>Carrito de Venta</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {cart.length} producto{cart.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <ShoppingCart size={48} />
              <h4>Carrito vacío</h4>
              <p>Agrega productos para iniciar una venta</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">${(item.price || 0).toLocaleString()} x {item.quantity} {item.unit}</div>
                </div>
                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, -1)}>
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="cart-item-total">
                    ${((item.price || 0) * item.quantity).toLocaleString()}
                  </div>
                  <button 
                    className="qty-btn" 
                    style={{ background: 'var(--danger)', width: '24px', height: '24px' }}
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span className="cart-total-label">Total</span>
            <span className="cart-total-value">${cartTotal.toLocaleString()}</span>
          </div>
          
          {showPayment ? (
            <div>
              <div className="form-group">
                <label className="form-label">Monto Recibido</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Ingrese el monto"
                  autoFocus
                />
              </div>
              {parseInt(paymentAmount || 0) >= cartTotal && (
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(0, 217, 165, 0.15)', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cambio</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                    ${change.toLocaleString()}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPayment(false)} disabled={completingSale}>
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={onCompleteSale}
                  disabled={parseInt(paymentAmount || 0) < cartTotal || completingSale}
                >
                  {completingSale ? (
                    <>
                      <span style={{ 
                        width: '18px', 
                        height: '18px', 
                        border: '2px solid rgba(255,255,255,0.3)', 
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block',
                        marginRight: '8px'
                      }} />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Completar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%' }}
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
            >
              <DollarSign size={20} />
              Cobrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Reports View
function ReportsView({ sales, products, currentUser }) {
  const showFullReports = can(currentUser, 'canViewFullReports')
  
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0)
  const totalSales = sales.length

  const topProducts = products
    .map(p => ({
      ...p,
      totalSold: sales.reduce((sum, s) => {
        const item = s.items?.find(i => i.product_id === p.id)
        return sum + (item ? item.quantity : 0)
      }, 0)
    }))
    .filter(p => p.totalSold > 0)
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5)

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon primary">
            <ShoppingCart />
          </div>
          <div className="stat-value">{totalSales}</div>
          <div className="stat-label">Total de Ventas</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon success">
            <DollarSign />
          </div>
          <div className="stat-value">${totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Ingresos Totales</div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon info">
            <Package />
          </div>
          <div className="stat-value">{products.filter(p => p.is_active !== false).length}</div>
          <div className="stat-label">Productos Activos</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos Más Vendidos</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Vendidos</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(product => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category?.name || product.category}</td>
                    <td>{product.totalSold} {product.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Historial de Ventas Recientes</h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {sales.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <History size={48} />
                <h4>Sin ventas aún</h4>
                <p>Las ventas aparecerán aquí</p>
              </div>
            ) : (
              sales.slice(0, 10).map(sale => (
                <div 
                  key={sale.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Venta #{sale.ticket_number || sale.id?.slice(-6)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(sale.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      ${(sale.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings View
function SettingsView({ categories, onDeleteCategory, onAddCategory, currentUser, users, onAddUser, onEditUser, onDeleteUser }) {
  const canManageUsers = can(currentUser, 'canManageUsers')

  if (!can(currentUser, 'canAccessSettings')) {
    return (
      <div className="empty-state" style={{ padding: '80px', textAlign: 'center' }}>
        <Settings size={64} style={{ opacity: 0.3, marginBottom: '24px' }} />
        <h3 style={{ marginBottom: '12px' }}>Acceso Restringido</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          No tienes permisos para acceder a la configuración del sistema.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Datos del Negocio</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre del Negocio</label>
            <input type="text" className="form-input" defaultValue="Salsamentaría invLeo" />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input type="text" className="form-input" defaultValue="Calle Principal #123" />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input type="text" className="form-input" defaultValue="+57 300 123 4567" />
          </div>
          <button className="btn btn-primary">
            <Save size={18} />
            Guardar Cambios
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestión de Datos</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <Download size={18} />
              Exportar Datos (JSON)
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <Upload size={18} />
              Importar Datos
            </button>
          </div>
        </div>
      </div>

      {/* Gestión de Usuarios - Solo para admin/owner */}
      {canManageUsers && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Gestión de Usuarios</h3>
            <button className="btn btn-primary btn-sm" onClick={onAddUser}>
              <User size={16} />
              Nuevo Usuario
            </button>
          </div>
          {users.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Users size={48} />
              <h4>Sin usuarios</h4>
              <p>No hay usuarios registrados aún</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Fecha de Creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: ROLE_LABELS[user.role]?.color || 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {user.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U'}
                          </div>
                          {user.name}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: `${ROLE_LABELS[user.role]?.color}20`,
                          color: ROLE_LABELS[user.role]?.color || 'var(--text-secondary)'
                        }}>
                          {ROLE_LABELS[user.role]?.label || user.role}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: user.is_active ? 'rgba(0, 217, 165, 0.15)' : 'rgba(233, 69, 96, 0.15)',
                          color: user.is_active ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => onEditUser(user)}
                            title="Editar usuario"
                          >
                            <Edit size={14} />
                          </button>
                          {user.id !== currentUser.id && (
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => onDeleteUser(user.id)}
                              title="Eliminar usuario"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Categorías de Productos</h3>
          <button className="btn btn-primary btn-sm" onClick={onAddCategory}>
            <Plus size={16} />
            Nueva Categoría
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '8px 0' }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              <Package2 size={16} style={{ color: 'var(--accent)' }} />
              {cat.name}
              <button
                onClick={() => onDeleteCategory(cat)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                title={`Eliminar categoría ${cat.name}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Product Modal
function ProductModal({ product, categories, onSave, onClose, onAddCategory }) {
  const [formData, setFormData] = useState(product || {
    name: '',
    category_id: categories[0]?.id || '',
    price: 0,
    cost: 0,
    stock: 0,
    min_stock: 5,
    unit: 'kg',
    type: 'weight',
    is_active: true
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="form-select"
                  style={{ flex: 1 }}
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onAddCategory}
                  style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                >
                  <Plus size={16} /> Nueva
                </button>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Precio de Venta</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Precio de Costo</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Stock Actual</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Stock Mínimo</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={formData.min_stock}
                  onChange={e => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select 
                  className="form-select"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="lb">Libras (lb)</option>
                  <option value="und">Unidad</option>
                  <option value="paq">Paquete</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Producto</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={formData.type === 'weight' ? 'Por Peso' : 'Por Unidad'}
                  disabled
                  style={{ background: 'var(--surface)' }}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// User Modal - Formulario para crear usuarios
function UserModal({ user, onSave, onClose }) {
  const [formData, setFormData] = useState(user || {
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    is_active: true
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input 
                type="email" 
                className="form-input"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ej: juan@ejemplo.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  className="form-input with-icon"
                  style={{ paddingLeft: '40px' }}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={user ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'}
                  required={!user}
                  minLength={6}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select 
                className="form-select"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="cashier">Cajero</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
                <option value="owner">Propietario</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Usuario activo
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span style={{ 
                    width: '18px', 
                    height: '18px', 
                    border: '2px solid rgba(255,255,255,0.3)', 
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                    marginRight: '8px'
                  }} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Customer Display Screen
function CustomerDisplay({ products, cart, cartTotal, onClose }) {
  return (
    <div className="customer-display">
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          <X size={18} />
          Cerrar
        </button>
      </div>

      <div className="customer-header">
        <div className="customer-logo">invLeo</div>
        <div className="customer-title">Salsamentaría & Quesos Frescos</div>
      </div>

      {cart && cart.length > 0 ? (
        <div style={{ 
          background: 'rgba(0, 217, 165, 0.15)', 
          border: '2px solid var(--success)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '700px',
          margin: '40px auto'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--success)', fontSize: '28px' }}>
            🛒 Pedido Actual
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
            {cart.map(item => (
              <div key={item.id} style={{ 
                background: 'var(--surface)', 
                padding: '12px 24px', 
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '18px'
              }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>${(item.price || 0).toLocaleString()} x {item.quantity}</span>
                <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '20px' }}>${((item.price || 0) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '2px solid var(--border)' }}>
            <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Total a Pagar: </span>
            <span style={{ fontSize: '48px', fontWeight: 700, color: 'var(--accent)', display: 'block', marginTop: '8px' }}>
              ${cartTotal.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '80px', color: 'var(--text-secondary)' }}>
          <ShoppingCart size={80} style={{ opacity: 0.5, marginBottom: '24px' }} />
          <h2 style={{ fontSize: '24px' }}>Esperando pedido...</h2>
          <p style={{ fontSize: '16px', marginTop: '12px' }}>Los productos aparecerán aquí</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--text-secondary)', fontSize: '14px' }}>
        <p>¡Gracias por su preferencia!</p>
        <p style={{ marginTop: '8px' }}>Visítenos en Calle Principal #123</p>
      </div>
    </div>
  )
}

export default App
