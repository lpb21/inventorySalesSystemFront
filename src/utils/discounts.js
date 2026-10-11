/**
 * Descuentos por línea del punto de venta (funciones puras, testeables).
 * El back recalcula todo con el precio de la BD; esto es para mostrar el
 * carrito con los mismos números que quedarán en la venta.
 */
import { normalizeNumber } from './measurements'

export const DEFAULT_DISCOUNT_PRESETS = [5, 10, 15, 20]
export const MAX_DISCOUNT_PRESETS = 6

const round2 = (value) => Math.round(value * 100) / 100

/** Porcentaje válido (0 a 100, 2 decimales); cualquier otra cosa es 0. */
export function normalizeDiscountPercent(value) {
  const percent = normalizeNumber(value, 0)
  if (!Number.isFinite(percent) || percent <= 0) return 0
  return round2(Math.min(percent, 100))
}

/** Precio × cantidad, antes del descuento. */
export function getLineGross(item) {
  return round2(normalizeNumber(item?.price, 0) * normalizeNumber(item?.quantity, 0))
}

export function getLineDiscount(item) {
  return round2(getLineGross(item) * normalizeDiscountPercent(item?.discount_percent) / 100)
}

/** Lo que se cobra por la línea, ya descontada. */
export function getLineTotal(item) {
  return round2(getLineGross(item) - getLineDiscount(item))
}

export function getCartDiscountTotal(cart = []) {
  return round2(cart.reduce((sum, item) => sum + getLineDiscount(item), 0))
}

export function cartHasDiscounts(cart = []) {
  return cart.some(item => normalizeDiscountPercent(item.discount_percent) > 0)
}

/**
 * El precio con descuento queda por debajo del costo.
 * Sin costo cargado (0) no hay contra qué comparar.
 */
export function isBelowCost(item) {
  const percent = normalizeDiscountPercent(item?.discount_percent)
  const cost = normalizeNumber(item?.cost, 0)
  if (percent <= 0 || cost <= 0) return false
  return normalizeNumber(item?.price, 0) * (1 - percent / 100) < cost
}

/** Cómo ingresa el porcentaje cada negocio: botones fijos o campo libre. */
export function getDiscountSettings(tenant) {
  const presets = Array.isArray(tenant?.discount_presets)
    ? tenant.discount_presets.map(normalizeDiscountPercent).filter(p => p > 0)
    : []
  return {
    mode: tenant?.discount_mode === 'free' ? 'free' : 'fixed',
    presets: presets.length ? presets : DEFAULT_DISCOUNT_PRESETS,
  }
}

/** Líneas con descuento, en el formato que pide la autorización en caja. */
export function buildDiscountAuthorizationItems(cart = []) {
  return cart
    .filter(item => normalizeDiscountPercent(item.discount_percent) > 0)
    .map(item => ({
      product_id: item.id,
      discount_percent: normalizeDiscountPercent(item.discount_percent),
    }))
}
