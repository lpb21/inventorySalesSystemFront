import { useState } from 'react'
import Swal from 'sweetalert2'
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
      const customerId = customer?.id ? String(customer.id) : null
      if (!customerId) throw new Error('El cliente seleccionado no tiene un ID válido')

      const formattedItems = pendingCreditSale.items.map(item => ({
        product_id: item.product_id,
        quantity:   item.quantity,
        unit_price: item.unit_price
      }))

      const saleData = {
        payment_method: 'credit',
        customer_id:    customerId,
        customer_name:  customer.name || '',
        subtotal:        pendingCreditSale.subtotal,
        discount:        0,
        tax:             0,
        total:           pendingCreditSale.total,
        note:            'Venta a crédito',
        items:           formattedItems
      }

      await salesAPI.create(saleData)
      clearCart()
      setPendingCreditSale(null)
      addToast('Venta a crédito completada exitosamente!', 'success')
      await Promise.all([loadProducts(), loadSales(), loadDashboard(), loadCustomers()])
    } catch (error) {
      const errorData    = error?.response?.data?.error
      const errorMessage = errorData?.message || error?.message || 'Error al completar venta a crédito'

      if (errorData?.code === 'VALIDATION_ERROR') {
        Swal.fire({
          icon:              'warning',
          title:             '⚠️ Límite de Crédito Alcanzado',
          html: `
            <p style="margin-bottom:12px;">${errorMessage}</p>
            <hr style="border-color:#444;margin:12px 0">
            <ul style="text-align:left;padding-left:20px;font-size:14px;color:#aaa;line-height:1.8">
              <li>Aumenta el límite del cliente en <b>Configuración → Clientes</b></li>
              <li>Solicita un abono parcial para liberar crédito</li>
              <li>Cambia el método de pago a <b>efectivo</b> o <b>tarjeta</b></li>
            </ul>`,
          confirmButtonText:  'Entendido',
          confirmButtonColor: '#e94560',
          background:         '#1a1f2e',
          color:              '#e6edf3',
          customClass:        { popup: 'swal-credit-error' }
        })
      } else {
        addToast(errorMessage, 'error')
      }
    } finally {
      setCompletingSale(false)
    }
  }

  /**
   * Registra un abono de un cliente con deuda pendiente.
   */
  const handleUpdateCredit = async (customerId, paymentAmount, note = '') => {
    try {
      await customersAPI.registerPayment(customerId, { amount: paymentAmount, note: note || 'Abono de cliente' })
      addToast('Pago registrado exitosamente', 'success')
      await Promise.all([loadCustomers(), loadSales()])
    } catch (error) {
      const errorData    = error?.response?.data?.error
      const errorMessage = errorData?.message || error?.message || 'Error al registrar pago'

      if (errorData?.code === 'VALIDATION_ERROR') {
        Swal.fire({
          icon:              'warning',
          title:             '⚠️ Error de Validación',
          html: `
            <p style="margin-bottom:12px;">${errorMessage}</p>
            <hr style="border-color:#444;margin:12px 0">
            <ul style="text-align:left;padding-left:20px;font-size:14px;color:#aaa;line-height:1.8">
              <li>Verifique que el monto del abono no exceda la deuda actual</li>
              <li>El cliente puede tener una deuda menor a la que intenta abonar</li>
              <li>Verifique el saldo actual en la tarjeta de detalle del cliente</li>
            </ul>`,
          confirmButtonText:  'Entendido',
          confirmButtonColor: '#e94560',
          background:         '#1a1f2e',
          color:              '#e6edf3',
          customClass:        { popup: 'swal-credit-error' }
        })
      } else {
        addToast(errorMessage, 'error')
      }
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
