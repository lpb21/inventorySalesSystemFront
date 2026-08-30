import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, ApiNormalizers } from '../../api/config'
 
const QUERY_KEY = ['admin-tenants']
 
/**
 * Lista todos los tenants con su estado de suscripción (solo superadmin).
 */
export function useAdminTenants(options = {}) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const response = await adminAPI.listTenants()
            return ApiNormalizers.normalizeList(response, ['data', 'tenants'])
        },
        ...options
    })
}
 
/**
 * Mutación para activar/renovar la suscripción de un tenant.
 * Recibe { id, period }.
 */
export function useAdminTenantMutations() {
    const queryClient = useQueryClient()
 
    const activate = useMutation({
        mutationFn: ({ id, period }) => adminAPI.activateTenant(id, period),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })

    const deactivate = useMutation({
        mutationFn: ({ id, reason }) => adminAPI.deactivateTenant(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })
 
    return { activate, deactivate }
}

/**
 * Historial de auditoría global, paginado (solo superadmin).
 */
export function useAdminAuditLogs(page = 1, limit = 30) {
    return useQuery({
        queryKey: ['admin-audit-logs', page, limit],
        queryFn: async () => {
            const response = await adminAPI.getAuditLogs(page, limit)
            // Devuelve { auditLogs, pagination }
            return response?.data || response
        },
        keepPreviousData: true,  // al cambiar de página, mantiene los datos previos (sin parpadeo)
    })
}