import { useQueryClient } from '@tanstack/react-query'
import { useSupplierMutations } from './queries/useSuppliers'
import Swal from 'sweetalert2'

/**
 * Hook personalizado para gestionar la lógica de proveedores en Settings
 * Extrae la lógica de toggle status y cache management
 */
export function useSupplierManagement(addToast) {
  const queryClient = useQueryClient()
  const { createSupplier, deactivateSupplier, reactivateSupplier } = useSupplierMutations()

  /**
   * Alterna el estado activo/inactivo de un proveedor
   */
  const toggleSupplierStatus = async (supplier) => {
    // Si está inactivo, reactivar directamente
    if (supplier.is_active === false) {
      try {
        await reactivateSupplier.mutateAsync(supplier.id)
        addToast('Proveedor activado', 'success')
      } catch (error) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Error al activar proveedor'
        addToast(errorMessage, 'error')
      }
      return
    }

    // Si está activo, mostrar confirmación antes de desactivar
    const result = await Swal.fire({
      title: '¿Desactivar proveedor?',
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          El proveedor <strong>${supplier.name}</strong> será desactivado.
        </p>
        <p style="color: var(--text-secondary); font-size: 14px;">
          Si tiene productos asociados, el sistema puede bloquear esta acción.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e94560',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      background: '#1a1f2e',
      color: '#e6edf3'
    })

    if (!result.isConfirmed) return

    try {
      await deactivateSupplier.mutateAsync(supplier.id)
      addToast('Proveedor desactivado', 'success')
    } catch (error) {
      const errorCode = error?.response?.data?.error?.code
      const backendMessage = error?.response?.data?.error?.message
      const isAssociatedProductsError =
        error?.response?.status === 409 ||
        errorCode === 'SUPPLIER_HAS_PRODUCTS' ||
        errorCode === 'BUSINESS_RULE_VIOLATION'

      const errorMessage = isAssociatedProductsError
        ? (backendMessage || 'No se puede desactivar el proveedor porque tiene productos asociados')
        : (backendMessage || error?.message || 'Error al desactivar proveedor')

      addToast(errorMessage, 'error')
    }
  }

  /**
   * Refresca la cache de proveedores
   */
  const refreshSuppliers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    await queryClient.refetchQueries({ queryKey: ['suppliers'], type: 'active' })
  }

  /**
   * Extrae el objeto supplier de diferentes formatos de respuesta
   */
  const extractSupplierFromResponse = (result) => {
    if (!result) return null
    if (result?.data?.supplier) return result.data.supplier
    if (result?.supplier) return result.supplier
    if (result?.id) return result
    return null
  }

  /**
   * Actualiza o inserta un proveedor en la cache
   */
  const upsertSupplierInCache = (supplier, isEdit) => {
    if (!supplier?.id) return

    queryClient.setQueriesData({ queryKey: ['suppliers'] }, (old = []) => {
      if (!Array.isArray(old)) return old

      if (isEdit) {
        return old.map((item) => (item.id === supplier.id ? { ...item, ...supplier } : item))
      }

      return [supplier, ...old]
    })
  }

  /**
   * Guarda un proveedor (crear o editar)
   */
  const saveSupplierWithCache = async (supplierData, isEdit, setIsSaving) => {
    setIsSaving(true)
    try {
      const result = await createSupplier.mutateAsync(supplierData)
      const savedSupplier = extractSupplierFromResponse(result)

      if (savedSupplier) {
        upsertSupplierInCache(savedSupplier, isEdit)
      }

      await refreshSuppliers()
      addToast(isEdit ? 'Proveedor actualizado' : 'Proveedor creado', 'success')
      return savedSupplier
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Error al guardar proveedor'
      addToast(errorMessage, 'error')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return {
    toggleSupplierStatus,
    refreshSuppliers,
    saveSupplierWithCache,
    extractSupplierFromResponse,
    upsertSupplierInCache,
    isDeactivating: deactivateSupplier.isPending,
    isReactivating: reactivateSupplier.isPending
  }
}
