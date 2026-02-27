import { Settings, Users, User, Edit, Trash2, Plus, Save, Download, Upload, X, Package2, Phone, Mail } from 'lucide-react'
import { can, ROLE_LABELS } from '../utils/permissions'

function SettingsView({ categories, onDeleteCategory, onAddCategory, currentUser, users, onAddUser, onEditUser, onDeleteUser, customers, onAddCustomer, onEditCustomer, onDeleteCustomer }) {
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

      {/* Gestión de Clientes */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Gestión de Clientes</h3>
          <button className="btn btn-primary btn-sm" onClick={onAddCustomer}>
            <User size={16} />
            Nuevo Cliente
          </button>
        </div>
        {customers.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <Users size={48} />
            <h4>Sin clientes</h4>
            <p>No hay clientes registrados aún</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Límite de Crédito</th>
                  <th>Deuda Actual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {customer.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'C'}
                        </div>
                        {customer.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {customer.phone && <div><Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />{customer.phone}</div>}
                        {customer.email && <div><Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />{customer.email}</div>}
                        {!customer.phone && !customer.email && <span>Sin contacto</span>}
                      </div>
                    </td>
                    <td>${(customer.credit_limit || 0).toLocaleString()}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: (customer.credit_balance || 0) > 0 ? 'rgba(233, 69, 96, 0.15)' : 'rgba(0, 217, 165, 0.15)',
                        color: (customer.credit_balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'
                      }}>
                        ${(customer.credit_balance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => onEditCustomer(customer)}
                          title="Editar cliente"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => onDeleteCustomer(customer.id)}
                          title="Eliminar cliente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default SettingsView
