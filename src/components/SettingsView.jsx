import { useState } from 'react'
import { Settings, Users, User, Edit, Trash2, Plus, Save, Download, Upload, Package2, Phone, Mail, Ban, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { can, ROLE_LABELS } from '../utils/permissions'
import ImportModal from './ImportModal'
import { ICON_OPTIONS } from './CategoryModal'

function SettingsView({ 
  categories, 
  onAddCategory, 
  onEditCategory,
  onToggleCategoryStatus,
  onToggleShowInactiveCategories,
  showInactiveCategories,
  currentUser, 
  users, 
  onAddUser, 
  onEditUser, 
  onToggleUserStatus, 
  customers, 
  onAddCustomer, 
  onEditCustomer, 
  onDeleteCustomer, 
  businessData, 
  onUpdateBusiness, 
  onRefreshProducts 
}) {
  const canManageUsers = can(currentUser, 'canManageUsers')
  const [showImportModal, setShowImportModal] = useState(false)
  
  // Función helper para obtener datos del negocio desde múltiples fuentes
  const getBusinessInfo = () => {
    // 1. businessData pasado como prop (del tenant API en App.jsx)
    if (businessData?.name) {
      return {
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone
      }
    }
    
    // 2. currentUser.tenant (datos del tenant incluidos en el usuario desde auth/me)
    if (currentUser?.tenant?.name) {
      return {
        name: currentUser.tenant.name,
        address: currentUser.tenant.address,
        phone: currentUser.tenant.phone
      }
    }
    
    // 3. currentUser directo (para backward compatibility - campos directos en el usuario)
    if (currentUser?.business_name) {
      return {
        name: currentUser.business_name,
        address: currentUser.business_address,
        phone: currentUser.business_phone
      }
    }
    
    // Valores por defecto
    return null
  }
  
  // Obtener los datos del negocio
  const businessInfo = getBusinessInfo()
  const businessName = businessInfo?.name || 'Mi Negocio'
  const businessAddress = businessInfo?.address || 'Sin dirección'
  const businessPhone = businessInfo?.phone || 'Sin teléfono'


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
            <input type="text" className="form-input" defaultValue={businessName} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input type="text" className="form-input" defaultValue={businessAddress} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input type="text" className="form-input" defaultValue={businessPhone} />
          </div>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input type="text" className="form-input" defaultValue={currentUser?.name || 'Usuario'} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="text" className="form-input" defaultValue={currentUser?.email || 'Sin email'} disabled style={{ opacity: 0.7 }} />
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
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setShowImportModal(true)}>
              <Upload size={18} />
              Importar Productos CSV
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
          {users.filter(user => user.id !== currentUser.id).length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Users size={48} />
              <h4>Sin usuarios</h4>
              <p>No hay otros usuarios registrados aún</p>
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
                  {users.filter(user => user.id !== currentUser.id).map(user => (
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
                              className={`btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => onToggleUserStatus(user.id, user.is_active)}
                              title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              style={user.is_active ? {} : { background: '#10b981', borderColor: '#10b981' }}
                            >
                              {user.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
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
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="card-title">Categorías de Productos</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={onToggleShowInactiveCategories}
            >
              {showInactiveCategories ? <EyeOff size={16} /> : <Eye size={16} />}
              {showInactiveCategories ? 'Ocultar Inactivas' : 'Categorías Inactivas'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={onAddCategory}>
              <Plus size={16} />
              Nueva Categoría
            </button>
          </div>
        </div>
        {categories.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <Package2 size={48} style={{ opacity: 0.3 }} />
            <h4>Sin categorías</h4>
            <p>No hay categorías creadas aún</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '8px 0' }}>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: cat.is_active === false ? 'rgba(233, 69, 96, 0.1)' : 'var(--background)',
                  border: '1px solid',
                  borderColor: cat.is_active === false ? 'var(--danger)' : 'var(--border)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: cat.is_active === false ? 0.7 : 1
                }}
              >
                {(() => {
                  const iconData = ICON_OPTIONS.find(i => i.name === cat.icon)
                  const IconComp = iconData ? iconData.icon : Package2
                  return <IconComp size={16} style={{ color: cat.is_active === false ? 'var(--danger)' : 'var(--accent)' }} />
                })()}
                {cat.name}
                {cat.is_active === false && (
                  <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold' }}>INACTIVA</span>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => onEditCategory(cat)}
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
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title={`Editar categoría ${cat.name}`}
                  >
                    <Edit size={14} />
                  </button>
                  {onToggleCategoryStatus && (
                    <button
                      onClick={() => onToggleCategoryStatus(cat)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: cat.is_active === false ? 'var(--success)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = cat.is_active === false ? 'var(--success)' : 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = cat.is_active === false ? 'var(--success)' : 'var(--text-secondary)'}
                      title={cat.is_active === false ? `Activar categoría ${cat.name}` : `Desactivar categoría ${cat.name}`}
                    >
                      {cat.is_active === false ? <CheckCircle size={14} /> : <Ban size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de importación de productos */}
      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={() => {
            if (onRefreshProducts) onRefreshProducts()
          }}
        />
      )}
    </div>
  )
}

export default SettingsView
