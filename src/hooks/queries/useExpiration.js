import { useQuery } from '@tanstack/react-query'
import { productsAPI } from '../../api/config'

/**
 * Hook para obtener productos próximos a vencer (30 días)
 */
export function useExpiringSoonProducts(options = {}) {
  return useQuery({
    queryKey: ['products', 'expiring-soon'],
    queryFn: async () => {
      const response = await productsAPI.getExpiringSoon()
      // Normalizar la respuesta
      return Array.isArray(response) ? response : (response?.data || [])
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  })
}

/**
 * Hook para obtener productos ya vencidos
 */
export function useExpiredProducts(options = {}) {
  return useQuery({
    queryKey: ['products', 'expired'],
    queryFn: async () => {
      const response = await productsAPI.getExpired()
      // Normalizar la respuesta
      return Array.isArray(response) ? response : (response?.data || [])
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  })
}

/**
 * Hook combinado que obtiene ambos tipos de productos con problemas de vencimiento
 */
export function useExpirationData(options = {}) {
  const expiringSoon = useExpiringSoonProducts(options)
  const expired = useExpiredProducts(options)

  return {
    expiringSoon: {
      data: expiringSoon.data || [],
      isLoading: expiringSoon.isLoading,
      error: expiringSoon.error
    },
    expired: {
      data: expired.data || [],
      isLoading: expired.isLoading,
      error: expired.error
    },
    isLoading: expiringSoon.isLoading || expired.isLoading,
    totalCount: (expiringSoon.data?.length || 0) + (expired.data?.length || 0)
  }
}
