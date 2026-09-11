import { Lock } from 'lucide-react'
import { can } from '../../utils/permissions'
import { useGlobalContext } from '../../context/GlobalContext'

/**
 * PermissionGate — muestra "Acceso Restringido" si el usuario no tiene el permiso,
 * o renderiza `children` si sí lo tiene.
 *
 * Props:
 *   permission  {string}  - clave de permiso (ej. "canManageAllTenants")
 *   icon        {node}    - icono lucide (default: Lock)
 *   title       {string}  - título del estado bloqueado (default: "Acceso Restringido")
 *   message     {string}  - descripción del estado bloqueado
 *   children    {node}    - contenido a mostrar cuando hay acceso
 */
export default function PermissionGate({
  permission,
  icon: Icon = Lock,
  title = 'Acceso Restringido',
  message = 'No cuentas con los permisos necesarios.',
  children,
}) {
  const { currentUser } = useGlobalContext()

  if (!can(currentUser, permission)) {
    return (
      <div className="empty-state" style={{ padding: '80px', textAlign: 'center' }}>
        <Icon size={64} style={{ opacity: 0.3, marginBottom: '24px' }} />
        <h3 style={{ marginBottom: '12px' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
      </div>
    )
  }

  return children
}
