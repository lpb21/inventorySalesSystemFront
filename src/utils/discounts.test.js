import { describe, it, expect } from 'vitest'
import {
  normalizeDiscountPercent,
  getLineGross,
  getLineDiscount,
  getLineTotal,
  getCartDiscountTotal,
  cartHasDiscounts,
  isBelowCost,
  getDiscountSettings,
  buildDiscountAuthorizationItems,
  DEFAULT_DISCOUNT_PRESETS,
} from './discounts'

describe('discounts - normalizeDiscountPercent', () => {
  it('acepta porcentajes entre 0 y 100 con 2 decimales', () => {
    expect(normalizeDiscountPercent(10)).toBe(10)
    expect(normalizeDiscountPercent('7,5')).toBe(7.5)
    expect(normalizeDiscountPercent(12.345)).toBe(12.35)
  })

  it('trata como 0 lo vacío, negativo o no numérico y recorta a 100', () => {
    expect(normalizeDiscountPercent('')).toBe(0)
    expect(normalizeDiscountPercent(undefined)).toBe(0)
    expect(normalizeDiscountPercent(-5)).toBe(0)
    expect(normalizeDiscountPercent('abc')).toBe(0)
    expect(normalizeDiscountPercent(150)).toBe(100)
  })
})

describe('discounts - cálculo por línea', () => {
  it('calcula bruto, descuento y neto', () => {
    const item = { price: 18000, quantity: 2, discount_percent: 10 }
    expect(getLineGross(item)).toBe(36000)
    expect(getLineDiscount(item)).toBe(3600)
    expect(getLineTotal(item)).toBe(32400)
  })

  it('sin descuento el neto es el bruto', () => {
    const item = { price: 8000, quantity: 3 }
    expect(getLineDiscount(item)).toBe(0)
    expect(getLineTotal(item)).toBe(24000)
  })

  it('redondea a 2 decimales en productos por peso', () => {
    const item = { price: 12990, quantity: 0.333, discount_percent: 7.5 }
    expect(getLineGross(item)).toBe(4325.67)
    expect(getLineDiscount(item)).toBe(324.43)
    expect(getLineTotal(item)).toBe(4001.24)
  })

  it('suma los descuentos del carrito y detecta si hay alguno', () => {
    const cart = [
      { id: 'a', price: 10000, quantity: 1, discount_percent: 10 },
      { id: 'b', price: 5000, quantity: 2 },
    ]
    expect(getCartDiscountTotal(cart)).toBe(1000)
    expect(cartHasDiscounts(cart)).toBe(true)
    expect(cartHasDiscounts([cart[1]])).toBe(false)
  })
})

describe('discounts - isBelowCost', () => {
  it('avisa cuando el precio con descuento queda por debajo del costo', () => {
    expect(isBelowCost({ price: 18000, cost: 14000, discount_percent: 25 })).toBe(true)  // 13500
    expect(isBelowCost({ price: 18000, cost: 14000, discount_percent: 20 })).toBe(false) // 14400
  })

  it('no avisa sin descuento ni sin costo cargado', () => {
    expect(isBelowCost({ price: 1000, cost: 2000, discount_percent: 0 })).toBe(false)
    expect(isBelowCost({ price: 1000, cost: 0, discount_percent: 50 })).toBe(false)
  })
})

describe('discounts - configuración del negocio', () => {
  it('usa valores fijos por defecto si el negocio no ha configurado nada', () => {
    expect(getDiscountSettings(null)).toEqual({ mode: 'fixed', presets: DEFAULT_DISCOUNT_PRESETS })
  })

  it('lee el modo y los porcentajes del negocio', () => {
    expect(getDiscountSettings({ discount_mode: 'free', discount_presets: [3, '12.5'] }))
      .toEqual({ mode: 'free', presets: [3, 12.5] })
  })
})

describe('discounts - buildDiscountAuthorizationItems', () => {
  it('incluye solo las líneas con descuento', () => {
    const cart = [
      { id: 'a', price: 10000, quantity: 1, discount_percent: 10 },
      { id: 'b', price: 5000, quantity: 2, discount_percent: 0 },
    ]
    expect(buildDiscountAuthorizationItems(cart)).toEqual([{ product_id: 'a', discount_percent: 10 }])
  })
})
