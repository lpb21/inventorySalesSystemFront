import { describe, it, expect, beforeEach } from 'vitest'
import {
  LAST_BUSINESS_KEY,
  getBusinessName,
  saveLastBusiness,
  getLastBusiness,
  clearLastBusiness,
} from './lastBusiness'

describe('lastBusiness - getBusinessName', () => {
  it('prioriza business_name sobre name', () => {
    const user = { tenant: { name: 'tenant-1', business_name: 'Salsamentaría Doña Rosa' } }
    expect(getBusinessName(user)).toBe('Salsamentaría Doña Rosa')
  })

  it('cae a tenant.name si no hay business_name', () => {
    expect(getBusinessName({ tenant: { name: 'La Esquina' } })).toBe('La Esquina')
  })

  it('devuelve null para superadmin (sin tenant) o nombres vacíos', () => {
    expect(getBusinessName({ tenant: null })).toBeNull()
    expect(getBusinessName({ tenant: { name: '   ' } })).toBeNull()
    expect(getBusinessName(undefined)).toBeNull()
  })
})

describe('lastBusiness - persistencia', () => {
  beforeEach(() => localStorage.clear())

  it('guarda y recupera el nombre del negocio', () => {
    saveLastBusiness({ tenant: { name: '  La Esquina  ' } })
    expect(localStorage.getItem(LAST_BUSINESS_KEY)).toBe('La Esquina')
    expect(getLastBusiness()).toBe('La Esquina')
  })

  it('no sobrescribe el último negocio si el usuario no tiene tenant', () => {
    saveLastBusiness({ tenant: { name: 'La Esquina' } })
    saveLastBusiness({ tenant: null })
    expect(getLastBusiness()).toBe('La Esquina')
  })

  it('clearLastBusiness olvida el negocio', () => {
    saveLastBusiness({ tenant: { name: 'La Esquina' } })
    clearLastBusiness()
    expect(getLastBusiness()).toBeNull()
  })
})
