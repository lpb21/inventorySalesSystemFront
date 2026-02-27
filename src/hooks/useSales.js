import { useState } from 'react'
import { salesAPI, customersAPI } from '../api/config'

/**
 * Hook para gestionar la lógica de ventas del punto de venta.
 * Maneja ventas normales, ventas a crédito y registro de pagos.
 *
 * @param {object} deps
 * @param {Array}    deps.cart           - Items actuales del carrito
 * @param {number}   deps.cartTotal      - Total del carrito
 * @param {Function} deps.clearCart      - Vacía el carrito y reinicia posKey
 * @param {Function} deps.addToast       - Muestra notificaciones
 * @param {Function} deps.loadProducts   - Recarga productos desde el backend
 * @param {Function} deps.loadSales      - Recarga ventas desde el backend
 * @param {Function} deps.loadDashboard  - Recarga datos del dashboard
 * @param {Function} deps.loadCustomers  - Recarga clientes desde el backend
 */
export function useSales({ cart, cartTotal, clearCart, addToast, loadProducts, loadSales, loadDashboard, loadCustomers }) {
  const [completingSale, setCompletingSale] = useState(false)
  const [pendingCreditSale, setPendingCreditSale] = useState(null)
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)

  /**
   * Completa una venta normal (efectivo, nequi, tarjeta).
   * Si el método es 'credit', abre el modal de selección de cliente.
   */
  const completeSale = async (paymentMethod = 'cash', amountReceived = cartTotal) => {
    if (cart.length === 0) return

    // Venta a crédito: recolectar datos y pedir selección de cliente
    if (paymentMethod === 'credit') {
      const saleItems = cart.map(item => ({
        product_id: item.id,
        quantity:   item.quantity,
        unit_price: item.price,
        subtotal:   item.price * item.quantity
      }))
      setPendingCreditSale({ items: saleItems, subtotal: cartTotal, total: cartTotal })
      setShowCustomerSelectModal(true)
      return
    }

    // Venta con pago inmediato
    setCompletingSale(true)
    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity:   item.quantity,
          unit_price: item.price,
          subtotal:   item.price * item.quantity
        })),
        subtotal:        cartTotal,
        discount:        0,
        total:           cartTotal,
        payment_method:  paymentMethod,
        amount_received: amountReceived,
        change_given:    Math.max(0, amountReceived - cartTotal),
        customer_id:     null
      }

      await salesAPI.create(saleData)
      clearCart()
      addToast('Venta completada exitosamente!', 'success')
      await Promise.all([loadProducts(), loadSales(), loadDashboard()])
    } catch (error) {
      addToast('Error al completar venta', 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  /**
   * Procesa la venta a crédito una vez que el usuario seleccionó el cliente.
   */
  const processCreditSale = async (customer) => {
    if (!pendingCreditSale || !customer) return

    setShowCustomerSelectModal(false)
    setCompletingSale(true)

    try {
      const saleData = {
        items:           pendingCreditSale.items,
        subtotal:        pendingCreditSale.subtotal,
        discount:        0,
        total:           pendingCreditSale.total,
        payment_method:  'credit',
        amount_received: 0,
        change_given:    0,
        customer_id:     customer.id
      }

      await salesAPI.create(saleData)
      clearCart()
      setPendingCreditSale(null)
      addToast('Venta a crédito completada exitosamente!', 'success')
      await Promise.all([loadProducts(), loadSales(), loadDashboard(), loadCustomers()])
    } catch (error) {
      addToast('Error al completar venta a crédito', 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  /**
   * Registra un abono de un cliente con deuda pendiente.
   */
  const handleUpdateCredit = async (customerId, paymentAmount, note = '') => {
    try {
      await customersAPI.registerPayment(customerId, {
        amount: paymentAmount,
        note:   note || 'Abono de cliente'
      })
      addToast('Pago registrado exitosamente', 'success')
      await Promise.all([loadCustomers(), loadSales()])
    } catch (error) {
      addToast('Error al registrar pago', 'error')
    }
  }

  return {
    completingSale,
    pendingCreditSale,
    setPendingCreditSale,
    showCustomerSelectModal,
    setShowCustomerSelectModal,
    completeSale,
    processCreditSale,
    handleUpdateCredit
  }
}
