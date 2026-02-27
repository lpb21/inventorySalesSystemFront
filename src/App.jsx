import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, 
  AlertTriangle, Search, BarChart3,
  RefreshCw, LogOut, Eye, Save, X, Check
} from 'lucide-react'
import Login from './Login'
import { 
  productsAPI, categoriesAPI, salesAPI, reportsAPI, 
  authAPI, usersAPI, getToken, getUser, setUser, clearSession
} from './api/config'

import { can, ROLE_LABELS } from './utils/permissions'
import DashboardView    from './components/DashboardView'
import InventoryView   from './components/InventoryView'
import SalesView       from './components/SalesView'
import ReportsView     from './components/ReportsView'
import SettingsView    from './components/SettingsView'
import ProductModal    from './components/ProductModal'
import UserModal       from './components/UserModal'
import CustomerDisplay from './components/CustomerDisplay'

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

      // Asegurar que los campos numéricos sean números, no strings
      const processedProducts = Array.isArray(productsData) ? productsData.map(product => ({
        ...product,
        price:     Number(product.price)     || 0,
        cost:      Number(product.cost)      || 0,
        stock:     Number(product.stock)     || 0,
        min_stock: Number(product.min_stock) || 0
      })) : []

      setProducts(processedProducts)
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

  // Guardar usuario (crear/editar)
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
    const matchesSearch   = product.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          quantity:   item.quantity,
          unit_price: item.price,
          subtotal:   item.price * item.quantity
        })),
        subtotal:        cartTotal,
        discount:        0,
        total:           cartTotal,
        payment_method:  'cash',
        amount_received: cartTotal,
        change_given:    0
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

export default App
