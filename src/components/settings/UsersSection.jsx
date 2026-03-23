import { Users, Edit, Trash2, Plus, Ban, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react'
import { can, ROLE_LABELS, getCreatableRoles, canEditUser } from '../../utils/permissions'

/**
 * Componente de la sección de Usuarios en Settings
 * Encapsula toda la lógica de visualización y gestión de usuarios
 */
function UsersSection({
  currentUser,
  users,
  maxUsers,
  onAddUser,
  onEditUser,
  onToggleStatus,
  onResetPassword
}) {
  const canManageUsers = can(currentUser, 'canManageUsers')
  const canCreateUsers = canManageUsers && getCreatableRoles(currentUser).length > 0
  const canResetPasswords = currentUser?.role === 'owner' || currentUser?.role === 'superadmin'
  const isUserLimitReached = !!maxUsers && users.length >= maxUsers

  if (!canManageUsers) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Usuarios
          </h3>
        </div>
        <div className="empty-state" style={{ padding: '40px' }}>
          <Ban size={48} />
          <h4>Sin permisos</h4>
          <p>No tienes permisos para gestionar usuarios</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Usuarios
        </h3>
        {canCreateUsers && (
          <button
            className="btn btn-primary"
            onClick={onAddUser}
            disabled={isUserLimitReached}
            title={isUserLimitReached ? `Límite alcanzado (${maxUsers} usuarios)` : 'Agregar usuario'}
          >
            <Plus size={18} />
            Agregar Usuario
          </button>
        )}
      </div>

      {isUserLimitReached && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.15)',
          border: '1px solid var(--warning)',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '0 16px 16px',
          color: 'var(--warning)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={18} />
          <span>Has alcanzado el límite de {maxUsers} usuarios en tu plan actual.</span>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const roleInfo = ROLE_LABELS[user.role] || {}
              const canEdit = canEditUser(currentUser, user)
              const isOwnAccount = currentUser?.id === user?.id

              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${roleInfo.color || '#6c757d'}20`,
                        color: roleInfo.color || '#6c757d'
                      }}
                    >
                      {roleInfo.label || user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: user.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                        color: user.is_active ? 'var(--success)' : 'var(--text-secondary)'
                      }}
                    >
                      {user.is_active ? (
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
                      {canEdit && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditUser(user)}
                          title="Editar usuario"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {canResetPasswords && !isOwnAccount && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onResetPassword(user)}
                          title="Restablecer contraseña"
                        >
                          <KeyRound size={14} />
                        </button>
                      )}
                      {canEdit && !isOwnAccount && (
                        <button
                          className={`btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => onToggleStatus(user)}
                          title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {user.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UsersSection
