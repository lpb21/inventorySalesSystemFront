import { useState, useEffect } from 'react'
import { AlertTriangle, X, Check } from 'lucide-react'
import Login from './Login'
import { 
  productsAPI, categoriesAPI, salesAPI, reportsAPI, 
  authAPI, usersAPI, customersAPI, inventoryAPI, tenantAPI, getToken, getUser, setUser, clearSession, ApiNormalizers
} from './api/config'

import { can } from './utils/permissions'
import { useCart } from './hooks/useCart'
import { useSales } from './hooks/useSales'
import { useProducts } from './hooks/useProducts'
import { useUsers } from './hooks/useUsers'
import { useCustomers } from './hooks/useCustomers'
import { useToasts } from './hooks/useToasts'

import AppLayout         from './components/AppLayout'
import DashboardView     from './components/DashboardView'
import InventoryView     from './components/InventoryView'
import SalesView         from './components/SalesView'
import ReportsView       from './components/ReportsView'
import SettingsView      from './components/SettingsView'
import ProductModal      from './components/ProductModal'
import UserModal         from './components/UserModal'
import CustomerModal     from './components/CustomerModal'
import CustomerDisplay   from './components/CustomerDisplay'
import MonthlyReportModal from './components/MonthlyReportModal'
import CreditModal       from './components/CreditModal'
import CreditAccountsView from './components/CreditAccountsView'
import CustomerSelectModal from './components/CustomerSelectModal'
import OutputModal       from './components/OutputModal'
import CategoryModal     from './components/CategoryModal'


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
  const [sales, setSales] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
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

  // Estado para mostrar/ocultar productos inactivos en inventario
  const [showInactiveProducts, setShowInactiveProducts] = useState(false)

  // Estado para mostrar/ocultar categorías inactivas en configuración
  const [showInactiveCategories, setShowInactiveCategories] = useState(false)

  // Estado para salidas de inventario
  const [showOutputModal, setShowOutputModal] = useState(false)

  // Datos del negocio (tenant)
  const [businessData, setBusinessData] = useState(null)

  // Datos del dashboard
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayProfit: 0,
    lowStockCount: 0,
    totalProducts: 0
  })

  // ── Notificaciones (toasts) ───────────────────────────────────────────────
  const { toasts, addToast, removeToast } = useToasts()

  // ── Estados de carga / error por recurso ───────────────────────────────────

  const [productsStatus, setProductsStatus] = useState({ loading: false, error: null })
  const [categoriesStatus, setCategoriesStatus] = useState({ loading: false, error: null })
  const [salesStatus, setSalesStatus] = useState({ loading: false, error: null })
  const [usersStatus, setUsersStatus] = useState({ loading: false, error: null })
  const [customersStatus, setCustomersStatus] = useState({ loading: false, error: null })
  const [dashboardStatus, setDashboardStatus] = useState({ loading: false, error: null })

  // ── Hook para el carrito ──────────────────────────────────────────────────

  const { cart, posKey, cartTotal, addToCart, updateCartQuantity, removeFromCart, clearCart } = useCart()

  // ── Funciones de carga de datos ───────────────────────────────────────────

  async function loadProducts() {
    setProductsStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await productsAPI.getAll({ limit: 100 })
      const data = ApiNormalizers.normalizeList(response, ['products'])
      setProducts(
        data.map(p => ({
          ...p,
          price:     Number(p.price)     || 0,
          cost:      Number(p.cost)      || 0,
          stock:     Number(p.stock)     || 0,
          min_stock: Number(p.min_stock) || 0,
          unit:      p.unit || 'und'
        }))
      )
      setProductsStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProducts([])
      setProductsStatus({ loading: false, error })
      addToast('Error al cargar productos', 'error')
    }
  }

  async function loadCategories() {
    setCategoriesStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await categoriesAPI.getAll()
      const list = ApiNormalizers.normalizeList(response, ['categories', 'data'])
      setCategories(list)
      setCategoriesStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando categorías:', error)
      setCategories([])
      setCategoriesStatus({ loading: false, error })
      addToast('Error al cargar categorías', 'error')
    }
  }

  async function loadAllCategories() {
    setCategoriesStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await categoriesAPI.getAllWithInactive()
      const list = ApiNormalizers.normalizeList(response, ['categories', 'data'])
      setCategories(list)
      setCategoriesStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando categorías:', error)
      setCategories([])
      setCategoriesStatus({ loading: false, error })
      addToast('Error al cargar categorías', 'error')
    }
  }

  async function loadSales() {
    setSalesStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await salesAPI.getAll()
      const list = ApiNormalizers.normalizeList(response, ['sales'])
      setSales(list)
      setSalesStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando ventas:', error)
      setSales([])
      setSalesStatus({ loading: false, error })
      addToast('Error al cargar ventas', 'error')
    }
  }

  async function loadDashboard() {
    setDashboardStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await reportsAPI.getDashboard()
      const d = ApiNormalizers.normalizeSuccessResponse(response)
      const summary = d.summary || d
      setDashboardData({
        todaySales:    Number(summary.todayRevenue)  || 0,
        todayProfit:   Number(summary.todayProfit)   || 0,
        lowStockCount: Number(summary.lowStockCount) || 0,
        totalProducts: Number(summary.totalProducts) || 0
      })
      setDashboardStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando dashboard:', error)
      setDashboardStatus({ loading: false, error })
      addToast('Error al cargar dashboard', 'error')
    }
  }

  async function loadUsers() {
    setUsersStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await usersAPI.getAll()
      const usersData = ApiNormalizers.normalizeList(response, ['users'])
      setUsers(usersData)
      setUsersStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      setUsers([])
      setUsersStatus({ loading: false, error })
      addToast('Error al cargar usuarios', 'error')
    }
  }

  async function loadCustomers() {
    setCustomersStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await customersAPI.getAll()
      const list = ApiNormalizers.normalizeList(response, ['customers'])
      setCustomers(list)
      setCustomersStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Error cargando clientes:', error)
      setCustomers([])
      setCustomersStatus({ loading: false, error })
      addToast('Error al cargar clientes', 'error')
    }
  }

  async function loadBusinessData() {
    if (currentUser?.tenant) {
      setBusinessData(currentUser.tenant)
    } else if (currentUser?.business_name) {
      setBusinessData({
        name: currentUser.business_name,
        address: currentUser.business_address,
        phone: currentUser.business_phone
      })
    }
  }

  const loadInitialData = async () => {
    try {
      const fns = [loadProducts(), loadCategories(), loadSales(), loadDashboard(), loadCustomers(), loadBusinessData()]
      if (can(currentUser, 'canManageUsers')) fns.push(loadUsers())
      await Promise.all(fns)
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
      addToast('Error al cargar datos iniciales', 'error')
    }
  }

  // ── Hooks de lógica de negocio ────────────────────────────────────────────

  const {
    completingSale,
    pendingCreditSale,
    setPendingCreditSale,
    showCustomerSelectModal,
    setShowCustomerSelectModal,
    completeSale,
    processCreditSale,
    handleUpdateCredit
  } = useSales({ cart, cartTotal, clearCart, addToast, loadProducts, loadSales, loadDashboard, loadCustomers })

  const {
    saveProduct,
    toggleProductStatus,
    deleteProduct
  } = useProducts({ addToast, loadProducts, editingProduct, setEditingProduct, setShowProductModal })

  const {
    saveUser,
    toggleUserStatus,
    handleEditUser
  } = useUsers({ addToast, loadUsers, editingUser, setEditingUser, setShowUserModal })

  const {
    saveCustomer,
    deleteCustomer,
    handleEditCustomer,
    handleAddCustomer
  } = useCustomers({ addToast, loadCustomers, currentUser, editingCustomer, setEditingCustomer, setShowCustomerModal })

  // ── Auth ──────────────────────────────────────────────────────────────────

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
    setBusinessData(null)
    setDashboardData({ todaySales: 0, todayProfit: 0, lowStockCount: 0, totalProducts: 0 })
    clearSession()
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

  // ── Funciones del carrito ─────────────────────────────────────────────────

  const handleAddToCart = (product) => {
    addToCart(product)
    addToast(`${product.name} agregado al carrito`)
  }

  // ── Categorías ────────────────────────────────────────────────────────────

  const handleSaveCategory = async (categoryData) => {
    try {
      await categoriesAPI.create({
        name: categoryData.name,
        description: categoryData.description || '',
        icon: categoryData.icon || 'package'
      })
      addToast('Categoría creada', 'success')
      setShowCategoryModal(false)
      await loadCategories()
    } catch (error) {
      addToast('Error al crear categoría', 'error')
    }
  }

  const handleToggleCategoryStatus = async (category) => {
    try {
      await categoriesAPI.toggleStatus(category.id)
      addToast(category.is_active ? 'Categoría desactivada' : 'Categoría activada', 'success')
      // Use the appropriate load function based on current view state
      if (showInactiveCategories) {
        await loadAllCategories()
      } else {
        await loadCategories()
      }
    } catch (error) {
      const errorData = error?.response?.data
      const msg = errorData?.error?.message || errorData?.message || error?.message || 'Error al eliminar categoría'
      addToast(msg, 'error')
    }
  }

  const handleToggleShowInactiveCategories = async () => {
    const newState = !showInactiveCategories
    setShowInactiveCategories(newState)
    if (newState) {
      await loadAllCategories()
    } else {
      await loadCategories()
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

  // ── Salidas de inventario ─────────────────────────────────────────────────

  const handleRegisterOutput = async (outputData) => {
    try {
      await inventoryAPI.createOutput(outputData)
      addToast('Salida registrada exitosamente', 'success')
      await Promise.all([loadProducts(), loadDashboard()])
    } catch (error) {
      addToast('Error al registrar salida: ' + (error.message || 'Error desconocido'), 'error')
      throw error
    }
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
      <AppLayout
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        lowStockCount={lowStockProducts.length}
        onRefresh={loadInitialData}
        onLogout={handleLogout}
      >
        {currentView === 'dashboard' && (
          <DashboardView 
            products={products}
            sales={sales}
            todaySales={dashboardData.todaySales}
            todayProfit={dashboardData.todayProfit}
            lowStockProducts={lowStockProducts}
            onNavigate={setCurrentView}
            loading={dashboardStatus.loading || productsStatus.loading || salesStatus.loading}
            currentUser={currentUser}
          />
        )}
        
        {currentView === 'inventory' && (
          <InventoryView 
            products={showInactiveProducts ? products : products.filter(p => p.is_active !== false)}
            showInactiveProducts={showInactiveProducts}
            setShowInactiveProducts={setShowInactiveProducts}
            toggleProductStatus={toggleProductStatus}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onAddProduct={() => { setEditingProduct(null); setShowProductModal(true) }}
            onEditProduct={p => { setEditingProduct(p); setShowProductModal(true) }}
            onDeleteProduct={deleteProduct}
            searchTerm={searchTerm}
            onAddCategory={() => setShowCategoryModal(true)}
            onRegisterOutput={() => setShowOutputModal(true)}
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
            onToggleCategoryStatus={handleToggleCategoryStatus}
            onToggleShowInactiveCategories={handleToggleShowInactiveCategories}
            showInactiveCategories={showInactiveCategories}
            currentUser={currentUser}
            users={users}
            onAddUser={() => { setEditingUser(null); setShowUserModal(true) }}
            onEditUser={handleEditUser}
            onToggleUserStatus={toggleUserStatus}
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={deleteCustomer}
            businessData={businessData}
            onUpdateBusiness={loadBusinessData}
            onRefreshProducts={loadProducts}
          />
        )}
        
        {currentView === 'credit-accounts' && (
          <CreditAccountsView 
            onUpdateCredit={handleUpdateCredit}
          />
        )}
      </AppLayout>

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
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              title="Cerrar"
            >
              <X size={16} />
            </button>
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

      {/* Modal de salidas de inventario */}
      {showOutputModal && (
        <OutputModal
          products={products}
          onSave={handleRegisterOutput}
          onClose={() => setShowOutputModal(false)}
        />
      )}
    </>
  )
}

export default App
