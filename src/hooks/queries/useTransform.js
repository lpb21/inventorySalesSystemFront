import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryAPI } from '../../api/config'
import { useGlobalContext } from '../../context/GlobalContext'
import { can } from '../../utils/permissions'

/**
 * Hook para ejecutar el despiece/transformación de inventario.
 * Descuenta un producto origen e incrementa varios destinos.
 */
export function useTransform() {
    const queryClient = useQueryClient()
    const { currentUser } = useGlobalContext()

    const invalidate = () => {
        // El despiece cambia el stock de varios productos → refrescar productos
        queryClient.invalidateQueries({ queryKey: ['products'] })

        // Y afecta métricas de inventario del dashboard (si el usuario puede verlas)
        if (can(currentUser, 'canViewFullReports')) {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }
    }

    const transform = useMutation({
        mutationFn: (data) => inventoryAPI.transform(data),
        onSuccess: invalidate,
    })

    return { transform }
}