/**
 * Lógica de negocio de ventas (funciones puras, testeables).
 * Extraídas de SalesView para poder probarlas y aligerar el componente.
 */
import { normalizeNumber } from './measurements'
import { getLineTotal, normalizeDiscountPercent } from './discounts'

/**
 * Calcula el vuelto a devolver.
 * Si el pago no alcanza el total, el vuelto es 0 (no negativo).
 */
export function calculateChange(paymentAmount, total) {
  const paid = normalizeNumber(paymentAmount, 0)
  const toPay = normalizeNumber(total, 0)
  return paid >= toPay ? paid - toPay : 0
}

/**
 * Determina si una venta se puede completar.
 * - El carrito no puede estar vacío.
 * - Si es a crédito, no requiere monto (se fía).
 * - Si es efectivo/otro, el monto debe cubrir el total.
 */
export function canCompleteSale({ paymentMethod, paymentAmount, total, cartLength }) {
  if (cartLength <= 0) return false
  if (paymentMethod === 'credit') return true
  return normalizeNumber(paymentAmount, 0) >= normalizeNumber(total, 0)
}

/**
 * Construye los items de venta a partir del carrito.
 * Cada item lleva su descuento y su subtotal ya descontado.
 */
export function buildSaleItems(cart = []) {
  return cart.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
    discount_percent: normalizeDiscountPercent(item.discount_percent),
    subtotal: getLineTotal(item),
  }))
}

/**
 * Calcula el total del carrito: cada línea con su descuento aplicado.
 */
export function calculateCartTotal(cart = []) {
  return Math.round(cart.reduce((sum, item) => sum + getLineTotal(item), 0) * 100) / 100
}