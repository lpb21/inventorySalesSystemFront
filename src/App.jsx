import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle, Check, X } from 'lucide-react'
import Login from './Login'
import { useGlobalContext } from './context/GlobalContext'
import { useDashboardData } from './hooks/queries/useDashboard'

import AppLayout         from './components/layout/AppLayout'
import DashboardView     from './components/dashboard/DashboardView'
import InventoryView     from './components/inventory/InventoryView'
import SalesView         from './components/sales/SalesView'
import ReportsView       from './components/reports/ReportsView'
import SettingsView      from './components/settings/SettingsView'
import MonthlyReportModal from './components/reports/MonthlyReportModal'
import CreditAccountsView from './components/shared/CreditAccountsView'

// Componente principal
function App() {
  const {
    isLoggedIn, currentUser, authChecked,
    addToast, logout,
    toasts, removeToast
  } = useGlobalContext()

  const { data: dashboardData, refetch: refreshDashboard } = useDashboardData({
    enabled: isLoggedIn && authChecked
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showMonthlyReport, setShowMonthlyReport] = useState(false)
  
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' })

  // Derived stock count (from dashboard stats)
  const lowStockCount = dashboardData?.metrics?.lowStockCount || 0

  const handleLogout = () => {
    logout()
  }

  // ── Reporte mensual ───────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoggedIn && authChecked) {
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
  }, [isLoggedIn, authChecked])

  const handleGenerateMonthlyReport = () => {
    addToast('Reporte mensual generado y caja reiniciada', 'success')
  }

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
    return <Login />
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
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/inventory" element={<InventoryView searchTerm={searchTerm} />} />
          <Route path="/sales" element={<SalesView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/credit-accounts" element={<CreditAccountsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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

      {/* Reporte mensual de cierre */}
      {showMonthlyReport && (
        <MonthlyReportModal
          onClose={() => setShowMonthlyReport(false)}
          onGenerateReport={handleGenerateMonthlyReport}
        />
      )}
    </>
  )
}

export default App
