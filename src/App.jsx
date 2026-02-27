import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, 
  AlertTriangle, Search, BarChart3,
  RefreshCw, LogOut, Eye, Save, X, Check, User
} from 'lucide-react'
import Swal from 'sweetalert2'
import Login from './Login'
import { 
  productsAPI, categoriesAPI, salesAPI, reportsAPI, 
  authAPI, usersAPI, customersAPI, getToken, getUser, setUser, clearSession
} from './api/config'

import { can, ROLE_LABELS } from './utils/permissions'
import { useCart } from './hooks/useCart'
import { useSales } from './hooks/useSales'
import DashboardView    from './components/DashboardView'
import InventoryView   from './components/InventoryView'
import SalesView       from './components/SalesView'
import ReportsView     from './components/ReportsView'
import SettingsView    from './components/SettingsView'
import ProductModal    from './components/ProductModal'
import UserModal       from './components/UserModal'
import CustomerModal   from './components/CustomerModal'
import CustomerDisplay from './components/CustomerDisplay'
import MonthlyReportModal from './components/MonthlyReportModal'
import CreditModal from './components/CreditModal'
import CreditAccountsView from './components/CreditAccountsView'
import CustomerSelectModal from './components/CustomerSelectModal'


// Componente principal
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(false)
  const [toasts, setToasts] = useState([])
  const [sales, setSales] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [loading, setLoading] = useState(false)
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' })

  // Estados para gestión de usuarios
  const [users, setUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // Estados para gestión de clientes
  const [customers, setCustomers] = useState([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)

  // Estado para reporte mensual
  const [showMonthlyReport, setShowMonthlyReport] = useState(false)

  // Estado para fiados/créditos
  const [showCreditModal, setShowCreditModal] = useState(false)

  // Datos del dashboard
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayProfit: 0,
    lowStockCount: 0,
    totalProducts: 0
  })

  // Hook para el carrito
  const { cart, posKey, cartTotal, addToCart, updateCartQuantity, removeFromCart, clearCart } = useCart()

  // Estados para ventas
  const [completingSale, setCompletingSale] = useState(false)
  const [pendingCreditSale, setPendingCreditSale] = useState(null)
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)

  // Funciones de ventas
  const completeSale = async (paymentMethod = 'cash', amountReceived = cartTotal) => {
    if (cart.length === 0) return
    if (paymentMethod === 'credit') {
      const saleItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }))
      setPendingCreditSale({ items: saleItems, subtotal: cartTotal, total: cartTotal })
      setShowCustomerSelectModal(true)
      return
    }
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
        payment_method: paymentMethod,
        amount_received: amountReceived,
        change_given: Math.max(0, amountReceived - cartTotal),
        customer_id: null
      }
      await salesAPI.create(saleData)
      clearCart()
      addToast('Venta completada exitosamente!', 'success')
      await Promise.all([loadProducts(), loadSales(), loadDashboard()])
    } catch (error) {
      addToast('Error al completar venta', 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  const processCreditSale = async (customer) => {
    if (!pendingCreditSale || !customer) return
    setShowCustomerSelectModal(false)
    setCompletingSale(true)
    try {
      const customerId = customer?.id ? String(customer.id) : null
      if (!customerId) throw new Error('El cliente seleccionado no tiene un ID válido')

      const formattedItems = pendingCreditSale.items.map(item => ({
        product_id: item.product_id,
        quantity:   item.quantity,
        unit_price: item.unit_price
      }))

      const saleData = {
        payment_method: 'credit',
        customer_id:    customerId,
        customer_name:  customer.name || '',
        subtotal:        pendingCreditSale.subtotal,
        discount:        0,
        tax:             0,
        total:           pendingCreditSale.total,
        note:            'Venta a crédito',
        items:           formattedItems
      }
      
      await salesAPI.create(saleData)
      clearCart()
      setPendingCreditSale(null)
      addToast('Venta a crédito completada exitosamente!', 'success')
      await Promise.all([loadProducts(), loadSales(), loadDashboard(), loadCustomers()])
    } catch (error) {
      const errorData    = error?.response?.data?.error
      const errorMessage = errorData?.message || error?.message || 'Error al completar venta a crédito'

      if (errorData?.code === 'VALIDATION_ERROR') {
        Swal.fire({
          icon:              'warning',
          title:             '⚠️ Límite de Crédito Alcanzado',
          html: `
            <p style="margin-bottom:12px;">${errorMessage}</p>
            <hr style="border-color:#444;margin:12px 0">
            <ul style="text-align:left;padding-left:20px;font-size:14px;color:#aaa;line-height:1.8">
              <li>Aumenta el límite del cliente en <b>Configuración → Clientes</b></li>
              <li>Solicita un abono parcial para liberar crédito</li>
              <li>Cambia el método de pago a <b>efectivo</b> o <b>tarjeta</b></li>
            </ul>`,
          confirmButtonText:  'Entendido',
          confirmButtonColor: '#e94560',
          background:         '#1a1f2e',
          color:              '#e6edf3',
          customClass:        { popup: 'swal-credit-error' }
        })
      } else {
        addToast(errorMessage, 'error')
      }
    } finally {
      setCompletingSale(false)
    }
  }




  const handleUpdateCredit = async (customerId, paymentAmount, note = '') => {
    try {
      await customersAPI.registerPayment(customerId, { amount: paymentAmount, note: note || 'Abono de cliente' })
      addToast('Pago registrado exitosamente', 'success')
      await Promise.all([loadCustomers(), loadSales()])
    } catch (error) {
      const errorData    = error?.response?.data?.error
      const errorMessage = errorData?.message || error?.message || 'Error al registrar pago'

      if (errorData?.code === 'VALIDATION_ERROR') {
        Swal.fire({
          icon:              'warning',
          title:             '⚠️ Error de Validación',
          html: `
            <p style="margin-bottom:12px;">${errorMessage}</p>
            <hr style="border-color:#444;margin:12px 0">
            <ul style="text-align:left;padding-left:20px;font-size:14px;color:#aaa;line-height:1.8">
              <li>Verifique que el monto del abono no exceda la deuda actual</li>
              <li>El cliente puede tener una deuda menor a la que intenta abonar</li>
              <li>Verifique el saldo actual en la tarjeta de detalle del cliente</li>
            </ul>`,
          confirmButtonText:  'Entendido',
          confirmButtonColor: '#e94560',
          background:         '#1a1f2e',
          color:              '#e6edf3',
          customClass:        { popup: 'swal-credit-error' }
        })
      } else {
        addToast(errorMessage, 'error')
      }
    }
  }


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
      .catch(() => clearSession())
      .finally(() => setAuthChecked(true))
  }, [])

  // 2) Cargar datos solo después de confirmar sesión con el backend
  useEffect(() => {
    if (authChecked && isLoggedIn && currentUser) {
      loadInitialData()
      checkMonthlyClosure()
    }
  }, [authChecked, isLoggedIn])

  // ── Funciones de carga de datos ───────────────────────────────────────────

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const fns = [loadProducts(), loadCategories(), loadSales(), loadDashboard(), loadCustomers()]
      if (can(currentUser, 'canManageUsers')) fns.push(loadUsers())
      await Promise.all(fns)
    } catch (error) {
      console.error('Error cargando datos:', error)
      addToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    try {
      const response = await productsAPI.getAll({ limit: 100 })
      let data = response.data ?? response
      if (!Array.isArray(data)) data = data.products || data.items || []
      setProducts(
        Array.isArray(data)
          ? data.map(p => ({
              ...p,
              price:     Number(p.price)     || 0,
              cost:      Number(p.cost)      || 0,
              stock:     Number(p.stock)     || 0,
              min_stock: Number(p.min_stock) || 0
            }))
          : []
      )
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProducts([])
    }
  }

  async function loadCategories() {
    try {
      const response = await categoriesAPI.getAll()
      let list = response.data ?? response
      if (!Array.isArray(list)) list = list.categories || list.items || list.data || []
      setCategories(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
      setCategories([])
    }
  }

  async function loadSales() {
    try {
      const response = await salesAPI.getAll()
      let list = response.data ?? response
      if (!Array.isArray(list)) list = list.sales || list.items || []
      setSales(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error cargando ventas:', error)
      setSales([])
    }
  }

  async function loadDashboard() {
    try {
      const response = await reportsAPI.getDashboard()
      const d = response.data || response
      const summary = d.summary || d
      setDashboardData({
        todaySales:    Number(summary.todayRevenue)  || 0,
        todayProfit:   Number(summary.todayProfit)   || 0,
        lowStockCount: Number(summary.lowStockCount) || 0,
        totalProducts: Number(summary.totalProducts) || 0
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  async function loadUsers() {
    try {
      const response = await usersAPI.getAll()
      let usersData = response.data ?? response
      if (!Array.isArray(usersData)) usersData = usersData.users || usersData.items || []
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      setUsers([])
    }
  }

  async function loadCustomers() {
    try {
      const response = await customersAPI.getAll()
      let list = response.data ?? response
      if (!Array.isArray(list)) list = list.customers || list.items || []
      setCustomers(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error cargando clientes:', error)
      setCustomers([])
    }
  }

  // ── Reporte mensual ───────────────────────────────────────────────────────

  const checkMonthlyClosure = () => {
    const lastShown = localStorage.getItem('lastMonthlyReportShown')
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate()
    if (lastShown !== currentMonth && (isLastDayOfMonth || !lastShown)) {
      setTimeout(() => {
        setShowMonthlyReport(true)
        localStorage.setItem('lastMonthlyReportShown', currentMonth)
      }, 2000)
    }
  }

  const handleGenerateMonthlyReport = (reportData) => {
    addToast('Reporte mensual generado y caja reiniciada', 'success')
  }

  // ── Notificaciones (toasts) ───────────────────────────────────────────────

  function addToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // ── Funciones del carrito ─────────────────────────────────────────────────

  const handleAddToCart = (product) => {
    addToCart(product)
    addToast(`${product.name} agregado al carrito`)
  }

  // ── Productos ─────────────────────────────────────────────────────────────

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

  // ── Categorías ────────────────────────────────────────────────────────────

  const handleSaveCategory = async (name) => {
    try {
      await categoriesAPI.create({ name })
      addToast('Categoría creada', 'success')
      setShowCategoryModal(false)
      await loadCategories()
    } catch (error) {
      addToast('Error al crear categoría', 'error')
    }
  }

  const handleDeleteCategory = async (cat) => {
    try {
      await categoriesAPI.delete(cat.id)
      addToast('Categoría eliminada', 'warning')
      await loadCategories()
    } catch (error) {
      const errorData = error?.response?.data
      const msg = errorData?.error?.message || errorData?.message || error?.message || 'Error al eliminar categoría'
      addToast(msg, 'error')
    }
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────

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
      addToast(error?.message || 'Error al guardar usuario', 'error')
    }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return
    try {
      await usersAPI.delete(userId)
      addToast('Usuario eliminado exitosamente', 'success')
      await loadUsers()
    } catch (error) {
      addToast(error?.message || 'Error al eliminar usuario', 'error')
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowUserModal(true)
  }

  // ── Clientes ──────────────────────────────────────────────────────────────

  const saveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, customerData)
        addToast('Cliente actualizado exitosamente', 'success')
      } else {
        // Agregar tenant_id al crear un nuevo cliente
        const customerWithTenant = {
          ...customerData,
          tenant_id: currentUser?.tenant_id
        }
        await customersAPI.create(customerWithTenant)
        addToast('Cliente creado exitosamente', 'success')
      }
      setShowCustomerModal(false)
      setEditingCustomer(null)
      await loadCustomers()
    } catch (error) {
      addToast(error?.message || 'Error al guardar cliente', 'error')
    }
  }

  const deleteCustomer = async (customerId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) return
    try {
      await customersAPI.delete(customerId)
      addToast('Cliente eliminado exitosamente', 'success')
      await loadCustomers()
    } catch (error) {
      addToast(error?.message || 'Error al eliminar cliente', 'error')
    }
  }

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer)
    setShowCustomerModal(true)
  }

  const handleAddCustomer = () => {
    setEditingCustomer(null)
    setShowCustomerModal(true)
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

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
    setCustomers([])
    setDashboardData({ todaySales: 0, todayProfit: 0, lowStockCount: 0, totalProducts: 0 })
    clearSession()
  }

  // ── Derivados ─────────────────────────────────────────────────────────────

  const filteredProducts = products.filter(p => {
    const matchesSearch   = p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || p.category_id === selectedCategory || p.category?.name === selectedCategory
    return matchesSearch && matchesCategory && p.is_active !== false
  })

  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0))

  // ── Pantallas de carga y login ────────────────────────────────────────────

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

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  // ── Render principal ──────────────────────────────────────────────────────

  return (
    <>
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
            <button className={`nav-item ${currentView === 'credit-accounts' ? 'active' : ''}`} onClick={() => setCurrentView('credit-accounts')}>
              <User />
              Cuentas por Cobrar
            </button>
            <button className={`nav-item ${currentView === 'reports' ? 'active' : ''}`} onClick={() => setCurrentView('reports')}>
              <BarChart3 />
              Reportes
            </button>
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
            <button className="nav-item" onClick={handleLogout}>

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
                onEditProduct={p => { setEditingProduct(p); setShowProductModal(true) }}
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
                onAddToCart={handleAddToCart}
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
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={() => setShowCategoryModal(true)}
                currentUser={currentUser}
                users={users}
                onAddUser={() => { setEditingUser(null); setShowUserModal(true) }}
                onEditUser={handleEditUser}
                onDeleteUser={deleteUser}
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onEditCustomer={handleEditCustomer}
                onDeleteCustomer={deleteCustomer}
              />
            )}
            
            {currentView === 'credit-accounts' && (
              <CreditAccountsView 
                onUpdateCredit={handleUpdateCredit}
              />
            )}

          </div>
        </main>
      </div>

      {/* Modales de inventario */}
      {showProductModal && (
        <ProductModal 
          product={editingProduct}
          categories={categories}
          onSave={saveProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(null) }}
          onAddCategory={() => setShowCategoryModal(true)}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          onSave={handleSaveCategory}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* Modales de usuarios y clientes */}
      {showUserModal && (
        <UserModal 
          user={editingUser}
          onSave={saveUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null) }}
        />
      )}

      {showCustomerModal && (
        <CustomerModal 
          customer={editingCustomer}
          onSave={saveCustomer}
          onClose={() => { setShowCustomerModal(false); setEditingCustomer(null) }}
        />
      )}

      {/* Pantalla del cliente */}
      {showCustomerDisplay && (
        <CustomerDisplay
          products={products.filter(p => p.is_active !== false)}
          cart={cart}
          cartTotal={cartTotal}
          onClose={() => setShowCustomerDisplay(false)}
        />
      )}

      {/* Cuentas por cobrar */}
      {showCreditModal && (
        <CreditModal
          customers={customers}
          onClose={() => setShowCreditModal(false)}
          onUpdateCredit={handleUpdateCredit}
        />
      )}

      {/* Selección de cliente para venta a crédito */}
      {showCustomerSelectModal && (
        <CustomerSelectModal
          customers={customers}
          onClose={() => {
            setShowCustomerSelectModal(false)
            setPendingCreditSale(null)
          }}
          onSelectCustomer={processCreditSale}
        />
      )}

      {/* Sistema de notificaciones */}
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

      {/* Modal de alerta genérico */}
      {alertModal.show && (
        <div className="alert-modal-overlay" onClick={() => setAlertModal({ show: false, title: '', message: '' })}>
          <div className="alert-modal" onClick={e => e.stopPropagation()}>
            <div className="alert-modal-header">
              <div className="alert-icon"><AlertTriangle size={28} /></div>
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

      {/* Reporte mensual de cierre */}
      {showMonthlyReport && (
        <MonthlyReportModal
          sales={sales}
          products={products}
          onClose={() => setShowMonthlyReport(false)}
          onGenerateReport={handleGenerateMonthlyReport}
        />
      )}
    </>
  )
}

export default App
