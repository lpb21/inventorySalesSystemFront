import Swal from 'sweetalert2'
import { productsAPI } from '../api/config'

/**
 * Hook para gestionar la lógica de productos.
 * Maneja crear, editar, activar/desactivar y eliminar productos.
 *
 * @param {object} deps
 * @param {Function} deps.addToast          - Muestra notificaciones
 * @param {Function} deps.loadProducts      - Recarga productos desde el backend
 * @param {object|null} deps.editingProduct - Producto en edición
 * @param {Function} deps.setEditingProduct - Setter del producto en edición
 * @param {Function} deps.setShowProductModal - Abre/cierra el modal de producto
 */
export function useProducts({ addToast, loadProducts, editingProduct, setEditingProduct, setShowProductModal }) {

  const saveProduct = async (product) => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, product)
        addToast('Producto actualizado', 'success')
      } else {
        await productsAPI.create(product)
        addToast('Producto creado', 'success')
      }
      setShowProductModal(false)
      setEditingProduct(null)
      await loadProducts()
    } catch (error) {
      addToast('Error al guardar producto', 'error')
    }
  }

  // Función para activar/desactivar (reactivar) productos
  const toggleProductStatus = async (product) => {
    try {
      await productsAPI.update(product.id, { is_active: !product.is_active })
      addToast(product.is_active ? 'Producto desactivado' : 'Producto reactivado', 'success')
      await loadProducts()
    } catch (error) {
      addToast('Error al cambiar estado del producto', 'error')
    }
  }

  const deleteProduct = async (id) => {
    // Primero mostrar modal de confirmación
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          Esta acción no se puede deshacer.
        </p>
        <ul style="text-align: left; padding-left: 20px; color: #aaa; font-size: 14px;">
          <li>El producto será eliminado del sistema</li>
          <li>Si el producto tiene stock, primero debe vaciar el inventario</li>
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
      customClass: { popup: 'swal-delete-product' }
    })
    
    if (!result.isConfirmed) return
    
    try {
      await productsAPI.delete(id)
      addToast('Producto eliminado exitosamente', 'success')
      await loadProducts()
    } catch (error) {
      const errorResponse = error.response?.data
      
      if (errorResponse && errorResponse.success === false) {
        // Error retornado por el servidor con formato conocido
        Swal.fire({
          icon: 'error',
          title: '⚠️ No se puede eliminar el producto',
          html: `
            <p style="color: var(--text-secondary); margin-bottom: 12px;">
              ${errorResponse.error?.message || 'Error desconocido'}
            </p>
            <hr style="border-color:#444;margin:12px 0">
            <ul style="text-align:left;padding-left:20px;font-size:14px;color:#aaa;line-height:1.8">
              <li>Vaya al inventario y registre una <b>salida de inventario</b> para vaciar el stock</li>
              <li>O edite el producto y reduzca el stock a 0</li>
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
        addToast(error?.message || 'Error al eliminar producto', 'error')
      }
    }
  }

  return {
    saveProduct,
    toggleProductStatus,
    deleteProduct
  }
}
