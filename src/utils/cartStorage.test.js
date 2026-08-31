import { describe, it, expect } from 'vitest'
import { getCartStorageKey, getLegacyCartStorageKey } from './cartStorage'

describe('cartStorage - getCartStorageKey', () => {
  it('usa el tenant.id cuando está disponible (prioridad máxima)', () => {
    const user = { tenant: { id: 'abc123' }, id: 'user1' }
    expect(getCartStorageKey(user)).toBe('invleo_cart_tenant_abc123')
  })

  it('acepta tenant_id como variante', () => {
    const user = { tenant_id: 'xyz789' }
    expect(getCartStorageKey(user)).toBe('invleo_cart_tenant_xyz789')
  })

  it('cae al userId si no hay tenant', () => {
    const user = { id: 'user42' }
    expect(getCartStorageKey(user)).toBe('invleo_cart_user_user42')
  })

  it('usa la clave por defecto si no hay tenant ni usuario', () => {
    expect(getCartStorageKey({})).toBe('invleo_cart_global')
  })

  it('prioriza tenant sobre usuario cuando ambos existen', () => {
    const user = { tenant: { id: 'tnt' }, id: 'usr' }
    expect(getCartStorageKey(user)).toBe('invleo_cart_tenant_tnt')
  })
})

describe('cartStorage - getLegacyCartStorageKey', () => {
  it('devuelve la clave legacy fija', () => {
    expect(getLegacyCartStorageKey()).toBe('invah_cart')
  })
})