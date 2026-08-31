import { describe, it, expect } from 'vitest'
import {
  calculateChange,
  canCompleteSale,
  buildSaleItems,
  calculateCartTotal,
} from './salesLogic'

describe('salesLogic - calculateChange', () => {
  it('calcula el vuelto cuando el pago supera el total', () => {
    expect(calculateChange(20000, 15000)).toBe(5000)
  })

  it('devuelve 0 si el pago es exacto', () => {
    expect(calculateChange(15000, 15000)).toBe(0)
  })

  it('devuelve 0 (no negativo) si el pago no alcanza', () => {
    expect(calculateChange(10000, 15000)).toBe(0)
  })

  it('maneja valores como string', () => {
    expect(calculateChange('20000', '15000')).toBe(5000)
  })
})

describe('salesLogic - canCompleteSale', () => {
  it('no permite vender con el carrito vacío', () => {
    expect(canCompleteSale({ paymentMethod: 'cash', paymentAmount: 20000, total: 15000, cartLength: 0 })).toBe(false)
  })

  it('permite venta a crédito sin monto', () => {
    expect(canCompleteSale({ paymentMethod: 'credit', paymentAmount: 0, total: 15000, cartLength: 2 })).toBe(true)
  })

  it('permite venta en efectivo si el monto cubre el total', () => {
    expect(canCompleteSale({ paymentMethod: 'cash', paymentAmount: 15000, total: 15000, cartLength: 1 })).toBe(true)
  })

  it('NO permite venta en efectivo si el monto es insuficiente', () => {
    expect(canCompleteSale({ paymentMethod: 'cash', paymentAmount: 10000, total: 15000, cartLength: 1 })).toBe(false)
  })
})

describe('salesLogic - buildSaleItems', () => {
  it('construye items con su subtotal', () => {
    const cart = [
      { id: 'p1', price: 15000, quantity: 2 },
      { id: 'p2', price: 8000, quantity: 1 },
    ]
    const result = buildSaleItems(cart)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ product_id: 'p1', quantity: 2, price: 15000, subtotal: 30000 })
    expect(result[1].subtotal).toBe(8000)
  })

  it('devuelve array vacío para carrito vacío', () => {
    expect(buildSaleItems([])).toEqual([])
  })
})

describe('salesLogic - calculateCartTotal', () => {
  it('suma precio × cantidad de todos los items', () => {
    const cart = [
      { price: 15000, quantity: 2 },  // 30000
      { price: 8000, quantity: 1 },   // 8000
    ]
    expect(calculateCartTotal(cart)).toBe(38000)
  })

  it('devuelve 0 para carrito vacío', () => {
    expect(calculateCartTotal([])).toBe(0)
  })

  it('maneja productos con peso decimal', () => {
    const cart = [{ price: 15000, quantity: 0.5 }]  // media libra
    expect(calculateCartTotal(cart)).toBe(7500)
  })
})