import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersAPI, ApiNormalizers } from '../../api/config'
import { can } from '../../utils/permissions'

export function useSuppliers({ includeInactive = false, ...options } = {}) {
    const user = JSON.parse(localStorage.getItem('invah_user') || 'null')
    const tenantId = user?.tenant?.id || user?.tenant_id // Soporte para ambas estructuras
    
    return useQuery({
        queryKey: ['suppliers', tenantId, includeInactive],
        queryFn: async () => {
            const response = includeInactive
                ? await suppliersAPI.getAllWithInactive()
                : await suppliersAPI.getAll()
            
            // Si ya es un array (venía directo), usarlo
            if (Array.isArray(response)) {
                return response
            }
            
            // Si viene en response.data.suppliers (estructura esperada)
            if (response.data && Array.isArray(response.data.suppliers)) {
                return response.data.suppliers
            }
            
            // Fallback con normalizador (buscar en data.suppliers)
            return ApiNormalizers.normalizeList(response, ['data', 'suppliers'])
        },
        enabled: !!tenantId && can(user, 'canViewSuppliers'), // Solo ejecutar si hay un tenantId válido
        staleTime: 1000 * 60 * 5, // 5 minutos
        ...options
    })
}

export function useSupplierMutations() {
    const queryClient = useQueryClient()

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
    
    // Función para limpiar cache al cambiar de usuario
    const clearSuppliersCache = () => {
        queryClient.removeQueries({ queryKey: ['suppliers'] })
    }

    const createSupplier = useMutation({
        mutationFn: async (data) => {
            const result = await suppliersAPI.create(data)
            
            // El backend puede devolver diferentes estructuras:
            // 1. { data: { supplier: {...} } } 
            // 2. { supplier: {...} }
            // 3. { ...supplier } (directo)
            if (result?.data?.supplier) {
                return result.data.supplier
            } else if (result?.supplier) {
                return result.supplier  
            } else if (result?.id) {
                return result // Es el supplier directamente
            } else {
                return result // Fallback
            }
        },
        onSuccess: invalidate,
        onError: (error) => {
            // Manejo específico de errores del backend
            if (error?.response?.status === 429) {
                throw new Error('Demasiadas solicitudes. Intenta en unos minutos (Rate limit: 50 req/min)')
            }
            if (error?.response?.status === 422) {
                throw new Error(error?.response?.data?.error?.message || 'Datos inválidos')
            }
            throw error
        }
    })

    const updateSupplier = useMutation({
        mutationFn: async ({ id, data }) => {
            const result = await suppliersAPI.update(id, data)
            
            // Mismo manejo que CREATE para diferentes estructuras
            if (result?.data?.supplier) {
                return result.data.supplier
            } else if (result?.supplier) {
                return result.supplier  
            } else if (result?.id) {
                return result
            } else {
                return result
            }
        },
        onSuccess: invalidate,
        onError: (error) => {
            if (error?.response?.status === 429) {
                throw new Error('Demasiadas solicitudes. Intenta en unos minutos (Rate limit: 50 req/min)')
            }
            if (error?.response?.status === 422) {
                throw new Error(error?.response?.data?.error?.message || 'Datos inválidos')
            }
            throw error
        }
    })

    const reactivateSupplier = useMutation({
        mutationFn: (id) => suppliersAPI.reactivate(id),
        onSuccess: invalidate,
        onError: (error) => {
            if (error?.response?.status === 429) {
                throw new Error('Demasiadas solicitudes. Intenta en unos minutos')
            }
            throw error
        }
    })

    const deactivateSupplier = useMutation({
        mutationFn: (id) => suppliersAPI.deactivate(id),
        onSuccess: invalidate,
        onError: (error) => {
            if (error?.response?.status === 429) {
                throw new Error('Demasiadas solicitudes. Intenta en unos minutos')
            }
            throw error
        }
    })

    return { 
        createSupplier, 
        updateSupplier, 
        reactivateSupplier, 
        deactivateSupplier,
        clearSuppliersCache 
    }
}