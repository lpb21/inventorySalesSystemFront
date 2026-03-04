import Swal from 'sweetalert2'
import { usersAPI } from '../api/config'

/**
 * Hook para gestionar la lógica de usuarios.
 * Maneja crear, editar y activar/desactivar usuarios.
 *
 * @param {object} deps
 * @param {Function} deps.addToast        - Muestra notificaciones
 * @param {Function} deps.loadUsers       - Recarga usuarios desde el backend
 * @param {object|null} deps.editingUser  - Usuario en edición
 * @param {Function} deps.setEditingUser  - Setter del usuario en edición
 * @param {Function} deps.setShowUserModal - Abre/cierra el modal de usuario
 */
export function useUsers({ addToast, loadUsers, editingUser, setEditingUser, setShowUserModal }) {

  const saveUser = async (userData) => {
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, userData)
        addToast('Usuario actualizado exitosamente', 'success')
      } else {
        await usersAPI.create(userData)
        addToast('Usuario creado exitosamente', 'success')
      }
      setShowUserModal(false)
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      addToast(error?.message || 'Error al guardar usuario', 'error')
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    const result = await Swal.fire({
      title: `¿${currentStatus ? 'Desactivar' : 'Activar'} usuario?`,
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          El usuario ${currentStatus ? 'perdirá acceso al sistema' : 'podrá acceder nuevamente'}.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: currentStatus ? '#e94560' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: currentStatus ? 'Sí, desactivar' : 'Sí, activar',
      cancelButtonText: 'Cancelar',
      background: '#1a1f2e',
      color: '#e6edf3',
      customClass: { popup: 'swal-toggle-user' }
    })
    
    if (!result.isConfirmed) return
    
    try {
      await usersAPI.toggleStatus(userId)
      addToast(`Usuario ${currentStatus ? 'desactivado' : 'activado'} exitosamente`, 'success')
      await loadUsers()
    } catch (error) {
      addToast(error?.message || 'Error al cambiar estado del usuario', 'error')
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowUserModal(true)
  }

  return {
    saveUser,
    toggleUserStatus,
    handleEditUser
  }
}
