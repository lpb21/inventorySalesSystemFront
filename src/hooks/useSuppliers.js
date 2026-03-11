import Swal from 'sweetalert2'
import { suppliersAPI } from '../api/config'

/**
 * Hook para gestionar la lógica de proveedores/suppliers.
 * Maneja crear, editar, activar/desactivar y eliminar proveedores.
 *
 * @param {object} deps
 * @param {Function} deps.addToast            - Muestra notificaciones
 * @param {Function} deps.loadSuppliers       - Recarga proveedores desde el backend
 * @param {object|null} deps.editingSupplier  - Proveedor en edición
 * @param {Function} deps.setEditingSupplier  - Setter del proveedor en edición
 * @param {Function} deps.setShowSupplierModal - Abre/cierra el modal de proveedor
 * @param {Function} deps.setIsSaving        - Estado de guardado
 */
export function useSuppliers({ 
  addToast, 
  loadSuppliers, 
  editingSupplier, 
  setEditingSupplier, 
  setShowSupplierModal,
  setIsSaving
}) {

  const saveSupplier = async (supplier) => {
    // Activar estado de carga
    if (setIsSaving) setIsSaving(true)
    
    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, supplier)
        addToast('Proveedor actualizado', 'success')
      } else {
        await suppliersAPI.create(supplier)
        addToast('Proveedor creado', 'success')
      }
      setShowSupplierModal(false)
      setEditingSupplier(null)
      await loadSuppliers()
    } catch (error) {
      // Manejar respuesta de error del servidor
      const errorResponse = error.response?.data
      
      if (errorResponse && errorResponse.success === false && errorResponse.error?.message) {
        // Mostrar el mensaje de error específico del servidor
        addToast(errorResponse.error.message, 'error')
      } else {
        // Mensaje genérico para errores inesperados
        addToast('Error al guardar proveedor', 'error')
      }
    } finally {
      // Desactivar estado de carga
      if (setIsSaving) setIsSaving(false)
    }
  }

  const toggleSupplierStatus = async (supplier) => {
    const isCurrentlyActive = supplier.is_active !== false
    
    const result = await Swal.fire({
      title: `¿${isCurrentlyActive ? 'Desactivar' : 'Activar'} proveedor?`,
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          El proveedor <strong>${supplier.name}</strong> será ${isCurrentlyActive ? 'desactivado' : 'activado'}.
        </p>
        ${isCurrentlyActive 
          ? '<p style="color: var(--text-secondary); font-size: 14px;">Los productos asociados ya no aparecerán en el inventario.</p>' 
          : '<p style="color: var(--text-secondary); font-size: 14px;">El proveedor volverá a aparecer en el inventario.</p>'
        }
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isCurrentlyActive ? '#e94560' : '#00d9a5',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isCurrentlyActive ? 'Sí, desactivar' : 'Sí, activar',
      cancelButtonText: 'Cancelar',
      background: '#1a1f2e',
      color: '#e6edf3'
    })
    
    if (!result.isConfirmed) return
    
    try {
      await suppliersAPI.toggleStatus(supplier.id)
      addToast(isCurrentlyActive ? 'Proveedor desactivado' : 'Proveedor activado', 'success')
      await loadSuppliers()
    } catch (error) {
      const errorResponse = error.response?.data
      
      if (errorResponse && errorResponse.success === false && errorResponse.error?.message) {
        addToast(errorResponse.error.message, 'error')
      } else {
        addToast(`Error al ${isCurrentlyActive ? 'desactivar' : 'activar'} proveedor`, 'error')
      }
    }
  }

  const deleteSupplier = async (id) => {
    // Mostrar modal de confirmación
    const result = await Swal.fire({
      title: '¿Eliminar proveedor?',
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          Esta acción no se puede deshacer.
        </p>
        <ul style="text-align: left; padding-left: 20px; color: #aaa; font-size: 14px;">
          <li>El proveedor será eliminado del sistema</li>
          <li>Los productos asociados quedarán sin proveedor</li>
        </ul>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e94560',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1a1f2e',
      color: '#e6edf3',
      customClass: { popup: 'swal-delete-supplier' }
    })
    
    if (!result.isConfirmed) return
    
    try {
      await suppliersAPI.delete(id)
      addToast('Proveedor eliminado exitosamente', 'success')
      await loadSuppliers()
    } catch (error) {
      const errorResponse = error.response?.data
      
      if (errorResponse && errorResponse.success === false) {
        // Error retornado por el servidor con formato conocido
        Swal.fire({
          icon: 'error',
          title: '⚠️ No se puede eliminar el proveedor',
          html: `
            <p style="color: var(--text-secondary); margin-bottom: 12px;">
              ${errorResponse.error?.message || 'Error desconocido'}
            </p>
            <hr style="border-color:#444;margin:12px 0">
            <ul style="text-align:left;padding-left:20px;font-size:14px;color:#aaa;line-height:1.8">
              <li>Primero desasocie los productos de este proveedor</li>
              <li>O elimine los productos que dependen de este proveedor</li>
            </ul>
          `,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#e94560',
          background: '#1a1f2e',
          color: '#e6edf3',
          customClass: { popup: 'swal-delete-error' }
        })
      } else {
        // Error genérico
        addToast('Error al eliminar proveedor', 'error')
      }
    }
  }

  return {
    saveSupplier,
    toggleSupplierStatus,
    deleteSupplier
  }
}
