import { useState } from 'react'
import { History, ChevronLeft, ChevronRight, User, Building2 } from 'lucide-react'
import { useAdminAuditLogs } from '../../hooks/queries/useAdminTenants'
 
/**
 * AdminAuditView — Historial global de auditoría (solo superadmin).
 * Tabla paginada de todos los movimientos de todos los tenants.
 */
function AdminAuditView() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useAdminAuditLogs(page, 30)
 
  const logs = data?.auditLogs || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, hasNextPage: false, hasPrevPage: false }
 
  // Color y etiqueta por tipo de acción
  const getActionStyle = (action) => {
    const map = {
      activate: { label: 'Activación', color: '#00d9a5' },
      suspend: { label: 'Suspensión', color: '#e94560' },
      create: { label: 'Creación', color: '#4a9eff' },
      update: { label: 'Actualización', color: '#f0a500' },
      delete: { label: 'Eliminación', color: '#e94560' },
      stock_adjustment: { label: 'Movimiento', color: '#8b5cf6' },
      login: { label: 'Ingreso', color: '#6b7280' },
      logout: { label: 'Salida', color: '#6b7280' },
      open_shift: { label: 'Apertura caja', color: '#00d9a5' },
      close_shift: { label: 'Cierre caja', color: '#f0a500' },
      price_change: { label: 'Cambio precio', color: '#f0a500' },
      cost_change: { label: 'Cambio costo', color: '#f0a500' },
    }
    return map[action] || { label: action, color: '#6b7280' }
  }
 
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
 
  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <History size={28} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ margin: 0 }}>Historial de Auditoría</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Todos los movimientos de todos los tenants
          </p>
        </div>
      </div>
 
      {isLoading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Cargando historial...
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Negocio</th>
                    <th>Acción</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const actionStyle = getActionStyle(log.action)
                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <div>
                              <div>{log.user?.name || '—'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {log.user?.email || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            {log.tenant?.business_name || log.tenant?.name || '—'}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                            fontSize: '12px', fontWeight: 500,
                            color: actionStyle.color,
                            background: `${actionStyle.color}22`,
                            whiteSpace: 'nowrap',
                          }}>
                            {actionStyle.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                          {log.description || '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No hay registros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
 
          {/* Controles de paginación */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '16px', gap: '12px', flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {pagination.total} registros · Página {pagination.page} de {pagination.totalPages}
              {isFetching && <span style={{ marginLeft: '8px' }}>· actualizando...</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
 
export default AdminAuditView