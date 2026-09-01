const COMMERCIAL_POUND_IN_KG = 0.5

export function isWeightProduct(product) {
  return product?.type === 'weight'
}

export function normalizeNumber(value, fallback = 0) {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function convertWeightQuantity(quantity, fromUnit = 'kg', toUnit = 'kg') {
  const amount = normalizeNumber(quantity, 0)
  if (fromUnit === toUnit) return amount

  const amountInKg = fromUnit === 'lb' ? amount * COMMERCIAL_POUND_IN_KG : amount
  return toUnit === 'lb' ? amountInKg / COMMERCIAL_POUND_IN_KG : amountInKg
}

export function formatQuantity(quantity) {
  const amount = normalizeNumber(quantity, 0)
  if (Number.isInteger(amount)) return String(amount)
  return amount.toFixed(3).replace(/\.?0+$/, '')
}

export function clampQuantity(quantity, maxQuantity) {
  const amount = normalizeNumber(quantity, 0)
  const max = normalizeNumber(maxQuantity, 0)
  return Math.min(Math.max(amount, 0), max)
}

export function getWeightSaleUnit(product) {
  //return product?.unit === 'kg' ? 'lb' : 'kg'
  // Todo se vende en la misma unidad del producto (sin conversión).
  return product?.unit || 'lb'
}

export function getPriceForSaleUnit(product, saleUnit) {
  const basePrice = normalizeNumber(product?.price, 0)
  if (!isWeightProduct(product)) return basePrice

  const unit = saleUnit || getWeightSaleUnit(product)
  const baseQuantity = convertWeightQuantity(1, unit, product?.unit || 'kg')
  return basePrice * baseQuantity
}
