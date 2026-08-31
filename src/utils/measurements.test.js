import { describe, it, expect } from 'vitest'
import {
  isWeightProduct,
  normalizeNumber,
  convertWeightQuantity,
  formatQuantity,
  clampQuantity,
} from './measurements'

describe('measurements - normalizeNumber', () => {
  it('convierte strings numéricos a número', () => {
    expect(normalizeNumber('5')).toBe(5)
    expect(normalizeNumber('3.5')).toBe(3.5)
  })

  it('acepta coma como separador decimal', () => {
    expect(normalizeNumber('2,5')).toBe(2.5)
  })

  it('devuelve el fallback si el valor no es válido', () => {
    expect(normalizeNumber('abc')).toBe(0)
    expect(normalizeNumber('abc', 10)).toBe(10)
    expect(normalizeNumber(null)).toBe(0)
  })

  it('maneja números directamente', () => {
    expect(normalizeNumber(7)).toBe(7)
  })
})

describe('measurements - isWeightProduct', () => {
  it('detecta productos por peso', () => {
    expect(isWeightProduct({ type: 'weight' })).toBe(true)
  })

  it('devuelve false para productos que no son por peso', () => {
    expect(isWeightProduct({ type: 'unit' })).toBe(false)
    expect(isWeightProduct(null)).toBe(false)
    expect(isWeightProduct({})).toBe(false)
  })
})

describe('measurements - convertWeightQuantity', () => {
  it('no convierte si las unidades son iguales', () => {
    expect(convertWeightQuantity(5, 'kg', 'kg')).toBe(5)
    expect(convertWeightQuantity(3, 'lb', 'lb')).toBe(3)
  })

  it('convierte de libras a kg (libra comercial = 0.5 kg)', () => {
    expect(convertWeightQuantity(1, 'lb', 'kg')).toBe(0.5)
    expect(convertWeightQuantity(2, 'lb', 'kg')).toBe(1)
  })

  it('convierte de kg a libras', () => {
    expect(convertWeightQuantity(1, 'kg', 'lb')).toBe(2)
    expect(convertWeightQuantity(0.5, 'kg', 'lb')).toBe(1)
  })
})

describe('measurements - formatQuantity', () => {
  it('muestra enteros sin decimales', () => {
    expect(formatQuantity(5)).toBe('5')
    expect(formatQuantity(10)).toBe('10')
  })

  it('quita ceros sobrantes en decimales', () => {
    expect(formatQuantity(1.5)).toBe('1.5')
    expect(formatQuantity(0.8)).toBe('0.8')
  })
})

describe('measurements - clampQuantity', () => {
  it('limita al máximo permitido', () => {
    expect(clampQuantity(10, 5)).toBe(5)
  })

  it('no permite valores negativos', () => {
    expect(clampQuantity(-3, 10)).toBe(0)
  })

  it('deja pasar valores dentro del rango', () => {
    expect(clampQuantity(3, 10)).toBe(3)
  })
})