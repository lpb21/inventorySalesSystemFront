import { Package2, Edit, Plus, Ban, CheckCircle, RefreshCw } from 'lucide-react'
import { can } from '../../utils/permissions'

/**
 * Componente de la sección de Proveedores en Settings
 */
function SuppliersSection({
  currentUser,
  suppliers,
  showInactive,
  onToggleShowInactive,
  onAddSupplier,
  onEditSupplier,
  onToggleStatus
}) {
  const canManageSuppliers = can(currentUser, 'canManageSuppliers')

  if (!canManageSuppliers) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Package2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Proveedores
          </h3>
        </div>
        <div className="empty-state" style={{ padding: '40px' }}>
          <Ban size={48} />
          <h4>Sin permisos</h4>
          <p>No tienes permisos para gestionar proveedores</p>
        </div>
      </div>
    )
  }

  // Filtrar proveedores según el toggle
  const filteredSuppliers = showInactive
    ? suppliers
    : suppliers.filter(s => s.is_active !== false)

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Package2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Proveedores
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
          <button className="btn btn-primary" onClick={onAddSupplier}>
            <Plus size={18} />
            Agregar Proveedor
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Documento</th>
              <th>Email</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {showInactive ? 'No hay proveedores registrados' : 'No hay proveedores activos'}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contact_name || '-'}</td>
                  <td>{supplier.document || '-'}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: supplier.is_active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                        color: supplier.is_active !== false ? 'var(--success)' : 'var(--text-secondary)'
                      }}
                    >
                      {supplier.is_active !== false ? (
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
                        onClick={() => onEditSupplier(supplier)}
                        title="Editar proveedor"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className={`btn btn-sm ${supplier.is_active !== false ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => onToggleStatus(supplier)}
                        title={supplier.is_active !== false ? 'Desactivar proveedor' : 'Activar proveedor'}
                      >
                        {supplier.is_active !== false ? <Ban size={14} /> : <RefreshCw size={14} />}
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

export default SuppliersSection
