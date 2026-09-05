import { useQueryClient } from '@tanstack/react-query'
import { useCategoryMutations } from './queries/useCategories'
import Swal from 'sweetalert2'

/**
 * Hook personalizado para gestionar la lógica de categorías en Settings
 * Extrae la lógica de toggle status y CRUD operations
 */
export function useCategoryManagement(addToast) {
  const queryClient = useQueryClient()
  const { createCategory, updateCategory, deactivateCategory, reactivateCategory } = useCategoryMutations()

  /**
   * Alterna el estado activo/inactivo de una categoría
   */
  const toggleCategoryStatus = async (category) => {
    // Si está inactiva, reactivar directamente
    if (category.is_active === false) {
      try {
        await reactivateCategory.mutateAsync(category.id)
        addToast('Categoría activada', 'success')
      } catch (error) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Error al activar categoría'
        addToast(errorMessage, 'error')
      }
      return
    }

    // Si está activa, mostrar confirmación antes de desactivar
    const result = await Swal.fire({
      title: '¿Desactivar categoría?',
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          La categoría <strong>${category.name}</strong> será desactivada.
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
      await deactivateCategory.mutateAsync(category.id)
      addToast('Categoría desactivada', 'success')
    } catch (error) {
      const errorCode = error?.response?.data?.error?.code
      const backendMessage = error?.response?.data?.error?.message
      const isAssociatedProductsError =
        error?.response?.status === 409 ||
        errorCode === 'CATEGORY_HAS_PRODUCTS' ||
        errorCode === 'BUSINESS_RULE_VIOLATION'

      const errorMessage = isAssociatedProductsError
        ? (backendMessage || 'No se puede desactivar la categoría porque tiene productos asociados')
        : (backendMessage || error?.message || 'Error al desactivar categoría')

      addToast(errorMessage, 'error')
    }
  }

  /**
   * Guarda una categoría (crear o editar)
   */
  const saveCategory = async (categoryData, isEdit) => {
    try {
      if (isEdit) {
        await updateCategory.mutateAsync({ id: categoryData.id, data: categoryData })
        addToast('Categoría actualizada', 'success')
      } else {
        await createCategory.mutateAsync(categoryData)
        addToast('Categoría creada', 'success')
      }
      return true
    } catch (error) {
      const apiError = error?.response?.data?.error
      const detailMessage = Array.isArray(apiError?.details) && apiError.details.length
        ? apiError.details.join(', ')
        : null
      const errorMessage = detailMessage || apiError?.message || error?.message || 'Error al guardar categoría'
      addToast(errorMessage, 'error')
      return false
    }
  }

  return {
    toggleCategoryStatus,
    saveCategory,
    isDeactivating: deactivateCategory.isPending,
    isReactivating: reactivateCategory.isPending,
    isCreating: createCategory.isPending,
    isUpdating: updateCategory.isPending
  }
}
