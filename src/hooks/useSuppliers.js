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

  const normalizeFieldName = (rawField = '') => {
    const key = rawField
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

    const fieldMap = {
      nombre: 'name',
      proveedor: 'name',
      contacto: 'contact_name',
      documento: 'document',
      ruc: 'document',
      email: 'email',
      correo: 'email',
      'teléfono': 'phone',
      telefono: 'phone',
      direccion: 'address',
      'dirección': 'address',
      notas: 'notes'
    }

    return fieldMap[key] || null
  }

  const extractFieldFromMessage = (message = '') => {
    const normalized = message
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const match = normalized.match(/campo\s+([a-z_\s]+?)\s+es\s+obligatorio/)
    if (!match?.[1]) return null

    return normalizeFieldName(match[1].trim())
  }

  const getValidationInfo = (errorResponse) => {
    if (errorResponse?.error?.code !== 'VALIDATION_ERROR') return null

    const details = errorResponse?.error?.details
    if (!Array.isArray(details) || details.length === 0) return null

    const stringDetails = details.filter((detail) => typeof detail === 'string')
    if (stringDetails.length === 0) return null

    const fieldErrors = {}

    stringDetails.forEach((detail) => {
      const inferredField = extractFieldFromMessage(detail)
      if (inferredField) {
        fieldErrors[inferredField] = detail
      }
    })

    return {
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : null,
      detailMessages: stringDetails
    }
  }

  const saveSupplier = async (supplier) => {
    if (setIsSaving) setIsSaving(true)

    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, supplier)
      } else {
        await suppliersAPI.create(supplier)
      }

      // Éxito: apiRequest ya lanza excepción si hay error HTTP, así que si llega aquí es OK
      addToast(editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado', 'success')
      setShowSupplierModal(false)
      setEditingSupplier(null)
      await loadSuppliers()
      return { success: true }

    } catch (error) {
      // apiRequest lanza siempre cuando HTTP no es 2xx
      // El body del error está en error.response.data
      const errorData = error?.response?.data
      const validationInfo = getValidationInfo(errorData)

      if (validationInfo) {
        const toastMsg = errorData?.error?.message || 'Error de validación'
        const detailsList = validationInfo.detailMessages?.join('\n• ') || ''
        addToast(detailsList ? `${toastMsg}\n\n• ${detailsList}` : toastMsg, 'error')

        return {
          success: false,
          message: toastMsg,
          formErrors: validationInfo.detailMessages || null,
          fieldErrors: validationInfo.fieldErrors || null
        }
      }

      // Error genérico del servidor
      const genericMsg = errorData?.error?.message || errorData?.message || 'Error al guardar proveedor'
      addToast(genericMsg, 'error')
      return {
        success: false,
        message: genericMsg,
        formErrors: null,
        fieldErrors: null
      }

    } finally {
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
