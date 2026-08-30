import { useState } from 'react'
import { Shield, Search, CheckCircle, PauseCircle, Clock, AlertTriangle, X, Save } from 'lucide-react'
import Swal from 'sweetalert2'
import { useGlobalContext } from '../../context/GlobalContext'
import { useAdminTenants, useAdminTenantMutations } from '../../hooks/queries/useAdminTenants'
 
/**
 * AdminTenantsView — Panel de superadmin para gestionar suscripciones.
 * Lista los tenants con su estado real y permite activar/renovar o suspender.
 */
function AdminTenantsView() {
  const { addToast } = useGlobalContext()
  const { data: tenants = [], isLoading } = useAdminTenants()
  const { activate, deactivate } = useAdminTenantMutations()
 
  const [search, setSearch] = useState('')
  const [activatingTenant, setActivatingTenant] = useState(null) // tenant al que se le abre el modal
 
  // Estado real: combina subscription_status + days_left (la fuente puede estar desincronizada)
  const getRealStatus = (tenant) => {
    if (tenant.subscription_status === 'suspended') {
      return { label: 'Suspendido', color: '#6b7280', icon: PauseCircle }
    }
    if (tenant.days_left === null) {
      return { label: 'Sin suscripción', color: '#6b7280', icon: AlertTriangle }
    }
    if (tenant.days_left < 0) {
      return { label: 'Vencido', color: '#e94560', icon: AlertTriangle }
    }
    if (tenant.days_left <= 7) {
      return { label: 'Por vencer', color: '#f0a500', icon: Clock }
    }
    return { label: 'Activo', color: '#00d9a5', icon: CheckCircle }
  }
 
  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    return (
      t.name?.toLowerCase().includes(q) ||
      t.business_name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q)
    )
  })
 
  const handleSuspend = async (tenant) => {
    const result = await Swal.fire({
      title: '¿Suspender tenant?',
      html: `
        <p style="color: var(--text-primary);">
          Se suspenderá <strong>"${tenant.business_name || tenant.name}"</strong>.
        </p>
        <p style="color: var(--text-secondary); font-size: 14px;">
          El cliente no podrá operar hasta que lo reactives. Sus datos se conservan.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e94560',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, suspender',
      cancelButtonText: 'Cancelar',
      background: '#1a1f2e',
      color: '#e6edf3',
    })
    if (!result.isConfirmed) return
 
    try {
      await deactivate.mutateAsync({ id: tenant.id, reason: 'Suspensión manual desde panel' })
      addToast('Tenant suspendido', 'success')
    } catch (error) {
      addToast('Error al suspender: ' + (error.message || ''), 'error')
    }
  }
 
  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Shield size={28} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ margin: 0 }}>Administración de Suscripciones</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Gestiona el acceso de los clientes (tenants)
          </p>
        </div>
      </div>
 
      {/* Buscador */}
      <div style={{ position: 'relative', maxWidth: '360px', marginBottom: '20px' }}>
        <div style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-secondary)'
        }}>
          <Search size={16} />
        </div>
        <input
          type="text"
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          style={{ paddingLeft: '38px' }}
        />
      </div>
 
      {/* Tabla */}
      {isLoading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Cargando tenants...
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Negocio</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tenant => {
                  const status = getRealStatus(tenant)
                  const StatusIcon = status.icon
                  return (
                    <tr key={tenant.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tenant.business_name || tenant.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tenant.name}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {tenant.email || '—'}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>{tenant.plan_code || '—'}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          color: status.color, fontWeight: 500, fontSize: '13px'
                        }}>
                          <StatusIcon size={15} /> {status.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {tenant.days_left === null ? '—' : (
                          tenant.days_left < 0
                            ? <span style={{ color: '#e94560' }}>Hace {Math.abs(tenant.days_left)} días</span>
                            : <span style={{ color: 'var(--text-secondary)' }}>En {tenant.days_left} días</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setActivatingTenant(tenant)}
                            title="Activar / Renovar"
                          >
                            <CheckCircle size={15} /> Activar
                          </button>
                          {tenant.subscription_status !== 'suspended' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSuspend(tenant)}
                              title="Suspender"
                            >
                              <PauseCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      No se encontraron tenants
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {/* Modal de activación */}
      {activatingTenant && (
        <ActivateModal
          tenant={activatingTenant}
          onClose={() => setActivatingTenant(null)}
          onActivate={async (period) => {
            try {
              await activate.mutateAsync({ id: activatingTenant.id, period })
              addToast(`Suscripción activada (${period})`, 'success')
              setActivatingTenant(null)
            } catch (error) {
              addToast('Error al activar: ' + (error.message || ''), 'error')
            }
          }}
        />
      )}
    </div>
  )
}
 
/**
 * Modal para elegir el periodo y activar/renovar la suscripción.
 */
function ActivateModal({ tenant, onClose, onActivate }) {
  const [period, setPeriod] = useState('monthly')
  const [saving, setSaving] = useState(false)
 
  const periods = [
    { value: 'trial', label: 'Prueba (7 días)' },
    { value: 'monthly', label: 'Mensual (30 días)' },
    { value: 'quarterly', label: 'Trimestral (90 días)' },
    { value: 'yearly', label: 'Anual (365 días)' },
  ]
 
  const handleConfirm = async () => {
    setSaving(true)
    await onActivate(period)
    setSaving(false)
  }
 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Activar Suscripción</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
 
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Cliente: <strong style={{ color: 'var(--text-primary)' }}>
              {tenant.business_name || tenant.name}
            </strong>
          </p>
 
          <div className="form-group">
            <label className="form-label">Periodo de suscripción</label>
            <select
              className="form-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
 
          <div style={{
            padding: '10px 12px', background: 'var(--bg-secondary)',
            borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)'
          }}>
            El periodo se cuenta desde hoy. Si ya tenía suscripción, se renueva.
          </div>
        </div>
 
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Activando...' : (<><Save size={18} /> Activar</>)}
          </button>
        </div>
      </div>
    </div>
  )
}
 
export default AdminTenantsView