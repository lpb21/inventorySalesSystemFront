import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashRegistersAPI } from '../api/config'

/**
 * Hook personalizado para manejar turnos de caja
 */
export function useCashRegister() {
  const queryClient = useQueryClient()

  // Query para obtener el turno activo del usuario
  const {
    data: activeShift,
    isLoading: loadingActiveShift,
    error: activeShiftError,
    refetch: refetchActiveShift
  } = useQuery({
    queryKey: ['cash-register', 'my-active'],
    queryFn: async () => {
      try {
        const result = await cashRegistersAPI.getMyActive()
        return result
      } catch (error) {
        // Si no hay turno activo (404), no es un error sino un estado normal
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    retry: 1,
    staleTime: 30000, // 30 segundos
  })

  // Query para obtener todos los turnos activos (solo para administradores)
  const {
    data: allActiveShifts = [],
    isLoading: loadingAllShifts
  } = useQuery({
    queryKey: ['cash-register', 'all-active'],
    queryFn: cashRegistersAPI.getAllActive,
    retry: 1,
    enabled: false, // Solo se ejecuta manualmente cuando se necesite
  })

  // Mutación para abrir turno
  const openShiftMutation = useMutation({
    mutationFn: cashRegistersAPI.open,
    onSuccess: (data) => {
      // Actualizar cache del turno activo
      queryClient.setQueryData(['cash-register', 'my-active'], data)
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })

  // Mutación para cerrar turno
  const closeShiftMutation = useMutation({
    mutationFn: ({ shiftId, data }) => cashRegistersAPI.close(shiftId, data),
    onSuccess: () => {
      // Limpiar el turno activo del cache
      queryClient.setQueryData(['cash-register', 'my-active'], null)
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })

  // Funciones de utilidad
  const hasActiveShift = Boolean(activeShift?.id)
  const isShiftOpen = hasActiveShift && !activeShift?.closed_at

  return {
    // Estado del turno activo
    activeShift,
    hasActiveShift,
    isShiftOpen,
    loadingActiveShift,
    activeShiftError,

    // Turnos de otros usuarios (admin)
    allActiveShifts,
    loadingAllShifts,

    // Mutaciones
    openShift: openShiftMutation.mutateAsync,
    closeShift: closeShiftMutation.mutateAsync,
    isOpeningShift: openShiftMutation.isPending,
    isClosingShift: closeShiftMutation.isPending,

    // Control manual
    refetchActiveShift,
    invalidateShifts: () => queryClient.invalidateQueries({ queryKey: ['cash-register'] }),
  }
}