import { User, Edit, Trash2, Plus, Ban, CheckCircle } from 'lucide-react'
import { can } from '../../utils/permissions'

/**
 * Componente de la sección de Clientes en Settings
 * Encapsula la visualización y gestión de clientes
 */
function CustomersSection({
  currentUser,
  customers,
  showInactive,
  onToggleShowInactive,
  onAddCustomer,
  onEditCustomer,
  onToggleStatus
}) {
  const canViewCredits = can(currentUser, 'canViewCreditAccounts')

  if (!canViewCredits) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <User size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Clientes de Crédito
          </h3>
        </div>
        <div className="empty-state" style={{ padding: '40px' }}>
          <Ban size={48} />
          <h4>Sin permisos</h4>
          <p>No tienes permisos para gestionar clientes de crédito</p>
        </div>
      </div>
    )
  }

  // Filtrar clientes según el toggle
  const filteredCustomers = showInactive
    ? customers
    : customers.filter(c => c.is_active !== false)

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <User size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Clientes de Crédito
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => onToggleShowInactive(e.target.checked)}
            />
            Mostrar inactivos
          </label>
          <button className="btn btn-primary" onClick={onAddCustomer}>
            <Plus size={18} />
            Agregar Cliente
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Teléfono</th>
              <th>Límite de Crédito</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No hay clientes registrados
                </td>
              </tr>
            ) : (
              filteredCustomers.map(customer => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.document || '-'}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>${(customer.credit_limit || 0).toLocaleString()}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: customer.is_active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                        color: customer.is_active !== false ? 'var(--success)' : 'var(--text-secondary)'
                      }}
                    >
                      {customer.is_active !== false ? (
                        <>
                          <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Activo
                        </>
                      ) : (
                        <>
                          <Ban size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Inactivo
                        </>
                      )}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEditCustomer(customer)}
                        title="Editar cliente"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className={`btn btn-sm ${customer.is_active !== false ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => onToggleStatus(customer)}
                        title={customer.is_active !== false ? 'Desactivar cliente' : 'Activar cliente'}
                      >
                        {customer.is_active !== false ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CustomersSection
