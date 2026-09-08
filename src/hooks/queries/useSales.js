import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesAPI, ApiNormalizers } from '../../api/config'
import { useGlobalContext } from '../../context/GlobalContext'
import { can } from '../../utils/permissions'

export function useSales(options = {}) {
    return useQuery({
        queryKey: ['sales'],
        queryFn: async () => {
            const response = await salesAPI.getAll({ limit: 50 })
            return ApiNormalizers.normalizeList(response, ['sales', 'data'])
        },
        ...options
    })
}

export function useSalesMutations() {
    const queryClient = useQueryClient()
    const { currentUser } = useGlobalContext()

    const invalidate = async () => {
        queryClient.invalidateQueries({ queryKey: ['sales'] })

        // Productos: forzar refetch (invalidate + refetch await) para que el stock
        // refleje la venta ya confirmada en el back, sin quedar "una venta atrasado"
        await queryClient.invalidateQueries({ queryKey: ['products'] })
        await queryClient.refetchQueries({ queryKey: ['products'], type: 'active' })
        
        // Turno de caja: refrescar transacciones/total del turno activo
        await queryClient.invalidateQueries({ queryKey: ['cash-register'] })
        await queryClient.refetchQueries({ queryKey: ['cash-register'], type: 'active' })

        // Solo invalidar dashboard si el usuario tiene permisos para verlo
        if (can(currentUser, 'canViewFullReports')) {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }

        // Invalidar customers para actualizar cuentas por cobrar/crédito
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        queryClient.invalidateQueries({ queryKey: ['customers', 'with-credit'] })
    }

    const createSale = useMutation({
        mutationFn: (data) => salesAPI.create(data),
        onSuccess: invalidate
    })

    const cancelSale = useMutation({
        mutationFn: ({ id, reason }) => salesAPI.cancel(id, reason),
        onSuccess: invalidate
    })

    return { createSale, cancelSale }
}
