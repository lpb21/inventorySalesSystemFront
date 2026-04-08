import { useState, useCallback } from 'react'
import { billingAPI } from '../api/config'
import { useGlobalContext } from '../context/GlobalContext'

// Hook para iniciar el flujo de checkout con ePayco
export function useBilling() {
  const { addToast } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCheckout = useCallback(async (planCode) => {
    setLoading(true)
    setError(null)

    try {
      // Verificar que hay token antes de intentar checkout
      const token = localStorage.getItem('invah_token')
      
      if (!token) {
        throw new Error('Sin sesión activa. Por favor intenta de nuevo.')
      }

      const result = await billingAPI.createCheckoutSession(planCode)

      // apiRequest() ya normaliza la respuesta, así que result es directamente { checkoutUrl, ... }
      const checkoutUrl = result?.checkoutUrl

      if (checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }

      throw new Error('No se pudo crear la sesión de pago')
    } catch (err) {
      const message = err?.response?.data?.error?.message || err.message || 'Error creando sesión de pago'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    handleCheckout,
    loading,
    error,
    clearError,
  }
}
