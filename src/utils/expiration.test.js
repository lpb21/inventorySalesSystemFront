import { describe, it, expect } from 'vitest'
import {
  isNearingExpiration,
  getDaysUntilExpiration,
  getProductsNearingExpiration,
  getExpirationStatus,
} from './expiration'

// Helper: crea una fecha a N días desde hoy (en formato YYYY-MM-DD)
function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

describe('expiration - getDaysUntilExpiration', () => {
  it('devuelve null si no hay fecha de vencimiento', () => {
    expect(getDaysUntilExpiration({})).toBe(null)
    expect(getDaysUntilExpiration({ expiry_date: null })).toBe(null)
  })

  it('calcula días para una fecha futura', () => {
    // producto que vence en ~5 días
    const days = getDaysUntilExpiration({ expiry_date: daysFromNow(5) })
    expect(days).toBeGreaterThanOrEqual(4)
    expect(days).toBeLessThanOrEqual(5)
  })

  it('devuelve negativo para productos ya vencidos', () => {
    const days = getDaysUntilExpiration({ expiry_date: daysFromNow(-3) })
    expect(days).toBeLessThan(0)
  })
})

describe('expiration - isNearingExpiration', () => {
  it('devuelve false si no hay fecha', () => {
    expect(isNearingExpiration({})).toBe(false)
  })

  it('detecta productos próximos a vencer (dentro de 7 días)', () => {
    expect(isNearingExpiration({ expiry_date: daysFromNow(3) })).toBe(true)
  })

  it('NO marca como próximo un producto que vence en mucho tiempo', () => {
    expect(isNearingExpiration({ expiry_date: daysFromNow(30) })).toBe(false)
  })

  it('NO marca como próximo un producto ya vencido', () => {
    expect(isNearingExpiration({ expiry_date: daysFromNow(-5) })).toBe(false)
  })

  it('respeta un umbral personalizado', () => {
    // vence en 10 días: no entra en umbral 7, pero sí en umbral 15
    expect(isNearingExpiration({ expiry_date: daysFromNow(10) }, 7)).toBe(false)
    expect(isNearingExpiration({ expiry_date: daysFromNow(10) }, 15)).toBe(true)
  })
})

describe('expiration - getProductsNearingExpiration', () => {
  it('filtra solo los productos próximos a vencer', () => {
    const products = [
      { name: 'Pronto', expiry_date: daysFromNow(2) },
      { name: 'Lejano', expiry_date: daysFromNow(60) },
      { name: 'Vencido', expiry_date: daysFromNow(-1) },
      { name: 'Sin fecha' },
    ]
    const result = getProductsNearingExpiration(products)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pronto')
  })
})

describe('expiration - getExpirationStatus', () => {
  it('sin fecha devuelve tipo none', () => {
    expect(getExpirationStatus({}).type).toBe('none')
  })

  it('producto vencido devuelve tipo expired', () => {
    expect(getExpirationStatus({ expiry_date: daysFromNow(-2) }).type).toBe('expired')
  })

  it('producto crítico (<=3 días) devuelve tipo critical', () => {
    const status = getExpirationStatus({ expiry_date: daysFromNow(2) })
    expect(status.type).toBe('critical')
  })

  it('producto con vencimiento lejano devuelve tipo normal', () => {
    expect(getExpirationStatus({ expiry_date: daysFromNow(30) }).type).toBe('normal')
  })
})