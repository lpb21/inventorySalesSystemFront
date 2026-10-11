import { useState, useEffect, useCallback } from 'react'
import { billingAPI } from '../api/config'
import { useGlobalContext } from '../context/GlobalContext'

// Hook para obtener la suscripción actual del negocio
export function useSubscription() {
  const { addToast } = useGlobalContext()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const subscriptionData = await billingAPI.getCurrentSubscription()

      // Estructura mejorada: { subscription, tenant, plan_info, time_info, can_access_system, ... }
      const subsData = subscriptionData?.data || subscriptionData || {}

      setSubscription(subsData)
    } catch (err) {
      const message = err?.response?.data?.error?.message || err.message || 'Error cargando información de suscripción'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
  }
}
