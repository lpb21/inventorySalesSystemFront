import { useState, useCallback, useEffect } from 'react'

/**
 * Hook para gestionar toasts de forma centralizada.
 * Devuelve la lista de toasts y una función addToast(message, type).
 * 
 * Mejoras:
 * - Botón de cierre en cada toast
 * - Auto eliminación más robusta
 * - Limite máximo de toasts para evitar acumulamiento
 * - Duración configurable por tipo de toast
 */
export function useToasts() {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Función para agregar un toast con configuración de duración
  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random() // ID único para evitar conflictos
    
    // Limitar a máximo 5 toasts para evitar acumulamiento
    setToasts(prev => {
      const newToasts = [...prev]
      if (newToasts.length >= 5) {
        // Eliminar el más antiguo
        newToasts.shift()
      }
      return [...newToasts, { id, message, type }]
    })

    // Auto eliminar después de la duración especificada
    // Solo si el toast aún existe (para evitar warnings)
    const toastTimeout = setTimeout(() => {
      setToasts(prev => {
        // Verificar si el toast aún existe antes de eliminar
        if (prev.some(t => t.id === id)) {
          return prev.filter(t => t.id !== id)
        }
        return prev
      })
    }, duration)

    // Limpiar el timeout si el componente se desmonta
    return () => clearTimeout(toastTimeout)
  }, [])

  // Función para limpiar todos los toasts
  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  return { toasts, addToast, removeToast, clearAllToasts }
}

