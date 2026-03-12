import { useState } from 'react'
import { X, Save, Lock } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { getCreatableRoles, canEditUser, ROLE_LABELS } from '../../utils/permissions'

function UserModal({ user, onSave, onClose }) {
  const { currentUser } = useGlobalContext()
  
  // Obtener roles que el usuario actual puede crear
  const creatableRoles = getCreatableRoles(currentUser)
  
  // Si está editando, verificar si puede editar este usuario
  const canEdit = user ? canEditUser(currentUser, user) : true
  const [formData, setFormData] = useState(user || {
    name: '',
    email: '',
    password: '',
    role: creatableRoles.length > 0 ? creatableRoles[0] : 'cashier',
    is_active: true
  })
  const [loading, setLoading] = useState(false)

  // Si no puede editar este usuario, mostrar mensaje
  if (!canEdit) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Sin Permisos</h3>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="modal-body">
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              No tienes permisos para editar este usuario.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si no puede crear usuarios, mostrar mensaje
  if (!user && creatableRoles.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Sin Permisos</h3>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="modal-body">
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              No tienes permisos para crear usuarios.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar que el rol seleccionado esté permitido
    if (!user && !creatableRoles.includes(formData.role)) {
      alert('No tienes permisos para asignar este rol')
      return
    }
    
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input 
                type="email" 
                className="form-input"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ej: juan@ejemplo.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  className="form-input with-icon"
                  style={{ paddingLeft: '40px' }}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={user ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'}
                  required={!user}
                  minLength={6}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select 
                className="form-select"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                disabled={user && !canEditUser(currentUser, { role: formData.role })} // Deshabilitar si no puede editar este rol
              >
                {creatableRoles.map(role => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]?.label || role}
                  </option>
                ))}
                {/* Si está editando y el rol actual no está en los roles creables, mantenerlo como opción */}
                {user && !creatableRoles.includes(user.role) && (
                  <option value={user.role} disabled>
                    {ROLE_LABELS[user.role]?.label || user.role} (No editable)
                  </option>
                )}
              </select>
              {creatableRoles.length === 0 && (
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Sin permisos para asignar roles
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Usuario activo
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span style={{ 
                    width: '18px', 
                    height: '18px', 
                    border: '2px solid rgba(255,255,255,0.3)', 
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                    marginRight: '8px'
                  }} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserModal
