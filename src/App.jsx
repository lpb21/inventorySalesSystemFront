import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle, Check, X } from 'lucide-react'
import Login from './Login'
import { useGlobalContext } from './context/GlobalContext'
import { useDashboardData } from './hooks/queries/useDashboard'

import AppLayout         from './components/layout/AppLayout'
import PermissionGate from './components/shared/PermissionGate'

const DashboardView     = lazy(() => import('./components/dashboard/DashboardView'))
const InventoryView     = lazy(() => import('./components/inventory/InventoryView'))
const SalesView         = lazy(() => import('./components/sales/SalesView'))
const ReportsView       = lazy(() => import('./components/reports/ReportsView'))
const SettingsView      = lazy(() => import('./components/settings/SettingsView'))
const CheckoutResult    = lazy(() => import('./components/billing/CheckoutResult'))
const SmartCheckout     = lazy(() => import('./components/billing/SmartCheckout'))
const RenewalRequired   = lazy(() => import('./components/billing/RenewalRequired'))
const CreditAccountsView = lazy(() => import('./components/shared/CreditAccountsView'))
const AdminTenantsView  = lazy(() => import('./components/admin/AdminTenantsView'))
const AdminAuditView    = lazy(() => import('./components/admin/AdminAuditView'))
const AdminAnnouncementsView = lazy(() => import('./components/admin/AdminAnnouncementsView'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: '200px', color: 'var(--text-secondary)', fontSize: '14px'
    }}>
      <span style={{
        width: '24px', height: '24px', borderRadius: '50%',
        border: '3px solid var(--border, #30363d)',
        borderTopColor: 'var(--accent, #e94560)',
        animation: 'spin 0.8s linear infinite', marginRight: '12px'
      }} />
      Cargando...
    </div>
  )
}

// Componente principal
function App() {
  const {
    isLoggedIn, currentUser, authChecked,
    logout,
    toasts, removeToast
  } = useGlobalContext()

  const { data: dashboardData, refetch: refreshDashboard } = useDashboardData({
    enabled: isLoggedIn && authChecked
  })

  const [searchTerm, setSearchTerm] = useState('')
  
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' })

  // Derived stock count (from dashboard stats)
  const lowStockCount = dashboardData?.metrics?.lowStockCount || 0

  const handleLogout = () => {
    logout()
  }

  // Prevenir cambio de valor en inputs numéricos al hacer scroll (Global)
  useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur()
      }
    }
    document.addEventListener('wheel', handleGlobalWheel, { passive: true })
    return () => document.removeEventListener('wheel', handleGlobalWheel)
  }, [])

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
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Rutas públicas de billing (sin autenticación) */}
            <Route path="/billing/renewal-required" element={<RenewalRequired />} />
            <Route path="/billing/smart-checkout" element={<SmartCheckout />} />
            <Route path="/billing/checkout-result" element={<CheckoutResult />} />
            {/* Login para usuarios sin sesión */}
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
      </>
    )
  }

  // ── Render principal ──────────────────────────────────────────────────────
  
  return (
    <>
      <AppLayout
        currentUser={currentUser}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        lowStockCount={lowStockCount}
        onRefresh={() => refreshDashboard()}
        onLogout={handleLogout}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/inventory" element={<InventoryView searchTerm={searchTerm} />} />
            <Route path="/sales" element={<SalesView />} />
            <Route path="/reports" element={<PermissionGate permission="canViewFullReports"><ReportsView /></PermissionGate>} />
            <Route path="/settings" element={<PermissionGate permission="canAccessSettings"><SettingsView /></PermissionGate>} />
            <Route path="/billing/checkout-result" element={<CheckoutResult />} />
            <Route path="/credit-accounts" element={<CreditAccountsView />} />
            <Route path="/admin/tenants" element={<PermissionGate permission="canManageAllTenants"><AdminTenantsView /></PermissionGate>} />
            <Route path="/admin/audit" element={<PermissionGate permission="canManageAllTenants"><AdminAuditView /></PermissionGate>} />
            <Route path="/admin/announcements" element={<PermissionGate permission="canManageAllTenants"><AdminAnnouncementsView /></PermissionGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>

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

    </>
  )
}

export default App
