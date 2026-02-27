import { useState, useEffect } from 'react'

/**
 * Hook para gestionar el carrito del punto de venta.
 * Sincroniza automáticamente el carrito con localStorage
 * para que la pantalla del cliente pueda leerlo.
 */
export function useCart() {
  const [cart, setCart] = useState([])
  const [posKey, setPosKey] = useState(0)

  // Sincronizar carrito con localStorage para la pantalla del cliente
  useEffect(() => {
    localStorage.setItem('invleo_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateCartQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  /**
   * Vacía el carrito y reinicia la clave del POS
   * (fuerza un remount de SalesView para limpiar su estado interno).
   */
  const clearCart = () => {
    setCart([])
    setPosKey(prev => prev + 1)
  }

  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0)

  return { cart, posKey, cartTotal, addToCart, updateCartQuantity, removeFromCart, clearCart }
}
