import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
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

// Historial paginado de ventas, con búsqueda por código (número de ticket) y
// rango de fechas (YYYY-MM-DD, en hora local del navegador).
export function useSalesHistory({ page = 1, limit = 10, search = '', startDate = '', endDate = '' } = {}) {
    return useQuery({
        queryKey: ['sales', 'history', { page, limit, search, startDate, endDate }],
        queryFn: async () => {
            const params = { page, limit, status: 'completed' }
            if (search) params.search = search
            if (startDate) params.start_date = new Date(`${startDate}T00:00:00`).toISOString()
            if (endDate) params.end_date = new Date(`${endDate}T23:59:59.999`).toISOString()

            const response = await salesAPI.getAll(params)
            return {
                sales: ApiNormalizers.normalizeList(response, ['sales', 'data']),
                pagination: response?.pagination || null,
            }
        },
        // Mantiene la página anterior visible mientras llega la siguiente
        placeholderData: keepPreviousData,
    })
}

export function useSalesMutations() {
    const queryClient = useQueryClient()
    const { currentUser } = useGlobalContext()

    // El back devuelve updated_products con el stock confirmado por producto
    // (calculado dentro de la transacción). Se usa para parchear la caché
    // de productos de inmediato, sin depender solo del refetch.
    const patchProductsStock = (response) => {
        const data = response?.data ?? response
        const updates = data?.updated_products
        if (!Array.isArray(updates) || updates.length === 0) return

        queryClient.setQueriesData({ queryKey: ['products'] }, (old) => {
            if (!Array.isArray(old)) return old
            const stockById = new Map(updates.map((u) => [u.id, Number(u.stock)]))
            return old.map((p) =>
                stockById.has(p.id) ? { ...p, stock: stockById.get(p.id) } : p
            )
        })
    }

    const invalidate = async (response) => {
        // Cancelar queries de productos en vuelo antes de parchear, para que una
        // respuesta vieja no pise el stock recién actualizado (carrera de lectura).
        await queryClient.cancelQueries({ queryKey: ['products'] })

        if (response) patchProductsStock(response)

        // Invalidaciones en background (no bloqueantes): el stock ya quedó
        // actualizado de forma optimista vía updated_products, por lo que no
        // esperamos los refetch antes de confirmar la venta al usuario.
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })

        // Turno de caja: refrescar transacciones/total del turno activo
        queryClient.invalidateQueries({ queryKey: ['cash-register'] })

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
        onSuccess: (response) => { invalidate(response) }
    })

    const cancelSale = useMutation({
        mutationFn: ({ id, reason }) => salesAPI.cancel(id, reason),
        onSuccess: (response) => { invalidate(response) }
    })

    return { createSale, cancelSale }
}
