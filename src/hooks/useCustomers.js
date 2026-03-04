import Swal from 'sweetalert2'
import { customersAPI } from '../api/config'

/**
 * Hook para gestionar la lógica de clientes.
 * Maneja crear, editar y eliminar clientes.
 *
 * @param {object} deps
 * @param {Function} deps.addToast            - Muestra notificaciones
 * @param {Function} deps.loadCustomers       - Recarga clientes desde el backend
 * @param {object|null} deps.currentUser      - Usuario actual (para tenant_id)
 * @param {object|null} deps.editingCustomer  - Cliente en edición
 * @param {Function} deps.setEditingCustomer  - Setter del cliente en edición
 * @param {Function} deps.setShowCustomerModal - Abre/cierra el modal de cliente
 */
export function useCustomers({ addToast, loadCustomers, currentUser, editingCustomer, setEditingCustomer, setShowCustomerModal }) {

  const saveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, customerData)
        addToast('Cliente actualizado exitosamente', 'success')
      } else {
        // Agregar tenant_id al crear un nuevo cliente
        const customerWithTenant = {
          ...customerData,
          tenant_id: currentUser?.tenant_id
        }
        await customersAPI.create(customerWithTenant)
        addToast('Cliente creado exitosamente', 'success')
      }
      setShowCustomerModal(false)
      setEditingCustomer(null)
      await loadCustomers()
    } catch (error) {
      addToast(error?.message || 'Error al guardar cliente', 'error')
    }
  }

  const deleteCustomer = async (customerId) => {
    const result = await Swal.fire({
      title: '¿Eliminar cliente?',
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          Esta acción no se puede deshacer.
        </p>
        <ul style="text-align: left; padding-left: 20px; color: #aaa; font-size: 14px;">
          <li>Se eliminará toda la información del cliente</li>
          <li>Las ventas realizadas no se eliminarán</li>
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
      customClass: { popup: 'swal-delete-customer' }
    })
    
    if (!result.isConfirmed) return
    
    try {
      await customersAPI.delete(customerId)
      addToast('Cliente eliminado exitosamente', 'success')
      await loadCustomers()
    } catch (error) {
      addToast(error?.message || 'Error al eliminar cliente', 'error')
    }
  }

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer)
    setShowCustomerModal(true)
  }

  const handleAddCustomer = () => {
    setEditingCustomer(null)
    setShowCustomerModal(true)
  }

  return {
    saveCustomer,
    deleteCustomer,
    handleEditCustomer,
    handleAddCustomer
  }
}
