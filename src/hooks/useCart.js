import { useState, useEffect } from 'react'
import {
  clampQuantity,
  convertWeightQuantity,
  getWeightSaleUnit,
  isWeightProduct,
  normalizeNumber
} from '../utils/measurements'

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
    localStorage.setItem('invah_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product) => {
    const weightProduct = isWeightProduct(product)
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item => {
        if (item.id !== product.id) return item

        if (!isWeightProduct(item)) {
          return { ...item, quantity: item.quantity + 1 }
        }

        const saleUnit = item.sale_unit || getWeightSaleUnit(item)
        const nextDisplayQuantity = normalizeNumber(item.display_quantity, 0) + 1
        const nextBaseQuantity = clampQuantity(
          convertWeightQuantity(nextDisplayQuantity, saleUnit, item.unit),
          item.stock
        )

        return {
          ...item,
          sale_unit: saleUnit,
          display_quantity: convertWeightQuantity(nextBaseQuantity, item.unit, saleUnit),
          quantity: nextBaseQuantity
        }
      }))
    } else {
      if (weightProduct) {
        const saleUnit = getWeightSaleUnit(product)
        const initialDisplayQuantity = 1
        const initialBaseQuantity = clampQuantity(
          convertWeightQuantity(initialDisplayQuantity, saleUnit, product.unit),
          product.stock
        )

        if (initialBaseQuantity <= 0) return

        setCart([
          ...cart,
          {
            ...product,
            quantity: initialBaseQuantity,
            sale_unit: saleUnit,
            display_quantity: convertWeightQuantity(initialBaseQuantity, product.unit, saleUnit)
          }
        ])
        return
      }

      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateCartQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        if (isWeightProduct(item)) return item
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const updateCartWeight = (id, displayQuantity, saleUnit) => {
    setCart(cart.map(item => {
      if (item.id !== id || !isWeightProduct(item)) return item

      const nextSaleUnit = saleUnit || item.sale_unit || getWeightSaleUnit(item)
      const requestedDisplayQuantity = normalizeNumber(displayQuantity, 0)
      const nextBaseQuantity = clampQuantity(
        convertWeightQuantity(requestedDisplayQuantity, nextSaleUnit, item.unit),
        item.stock
      )

      if (nextBaseQuantity <= 0) return item

      return {
        ...item,
        sale_unit: nextSaleUnit,
        display_quantity: convertWeightQuantity(nextBaseQuantity, item.unit, nextSaleUnit),
        quantity: nextBaseQuantity
      }
    }))
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

  return {
    cart,
    posKey,
    cartTotal,
    addToCart,
    updateCartQuantity,
    updateCartWeight,
    removeFromCart,
    clearCart
  }
}
