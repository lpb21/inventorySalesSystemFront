/**
 * Lógica de negocio de ventas (funciones puras, testeables).
 * Extraídas de SalesView para poder probarlas y aligerar el componente.
 */
import { normalizeNumber } from './measurements'

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
 * Cada item lleva su subtotal calculado (precio × cantidad).
 */
export function buildSaleItems(cart = []) {
  return cart.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    price: item.price,
    subtotal: normalizeNumber(item.price, 0) * normalizeNumber(item.quantity, 0),
  }))
}

/**
 * Calcula el total del carrito (precio × cantidad de cada item).
 * Misma lógica que useCart, extraída para poder testearla.
 */
export function calculateCartTotal(cart = []) {
  return cart.reduce(
    (sum, item) => sum + normalizeNumber(item.price, 0) * normalizeNumber(item.quantity, 0),
    0
  )
}