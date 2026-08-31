import { describe, it, expect } from 'vitest'
import {
  can,
  getCreatableRoles,
  canCreateRole,
  canEditUser,
} from './permissions'

describe('permissions - can', () => {
  it('devuelve false si no hay usuario', () => {
    expect(can(null, 'canEditProducts')).toBe(false)
    expect(can(undefined, 'canEditProducts')).toBe(false)
  })

  it('el cajero NO puede editar productos ni ver costos', () => {
    const cashier = { role: 'cashier' }
    expect(can(cashier, 'canEditProducts')).toBe(false)
    expect(can(cashier, 'canViewCosts')).toBe(false)
    expect(can(cashier, 'canManageUsers')).toBe(false)
  })

  it('el admin puede gestionar todo lo de su negocio', () => {
    const admin = { role: 'admin' }
    expect(can(admin, 'canEditProducts')).toBe(true)
    expect(can(admin, 'canDeleteProducts')).toBe(true)
    expect(can(admin, 'canManageUsers')).toBe(true)
    expect(can(admin, 'canAccessSettings')).toBe(true)
  })

  it('solo el superadmin puede gestionar todos los tenants', () => {
    expect(can({ role: 'superadmin' }, 'canManageAllTenants')).toBe(true)
    expect(can({ role: 'admin' }, 'canManageAllTenants')).toBe(false)
    expect(can({ role: 'owner' }, 'canManageAllTenants')).toBe(false)
  })

  it('el supervisor puede editar pero no borrar productos', () => {
    const supervisor = { role: 'supervisor' }
    expect(can(supervisor, 'canEditProducts')).toBe(true)
    expect(can(supervisor, 'canDeleteProducts')).toBe(false)
  })

  it('devuelve false para un rol inexistente', () => {
    expect(can({ role: 'hacker' }, 'canEditProducts')).toBe(false)
  })
})

describe('permissions - getCreatableRoles', () => {
  it('el viewer no puede crear ningún usuario', () => {
    expect(getCreatableRoles({ role: 'viewer' })).toEqual([])
  })

  it('el admin puede crear viewer, cashier y supervisor', () => {
    expect(getCreatableRoles({ role: 'admin' })).toEqual(['viewer', 'cashier', 'supervisor'])
  })

  it('devuelve lista vacía si el usuario no tiene rol', () => {
    expect(getCreatableRoles(null)).toEqual([])
    expect(getCreatableRoles({})).toEqual([])
  })
})

describe('permissions - canCreateRole', () => {
  it('el admin puede crear un supervisor', () => {
    expect(canCreateRole({ role: 'admin' }, 'supervisor')).toBe(true)
  })

  it('el admin NO puede crear otro admin ni un owner', () => {
    expect(canCreateRole({ role: 'admin' }, 'admin')).toBe(false)
    expect(canCreateRole({ role: 'admin' }, 'owner')).toBe(false)
  })

  it('el cajero solo puede crear un viewer', () => {
    expect(canCreateRole({ role: 'cashier' }, 'viewer')).toBe(true)
    expect(canCreateRole({ role: 'cashier' }, 'cashier')).toBe(false)
  })
})

describe('permissions - canEditUser', () => {
  it('un admin puede editar a un cajero (nivel menor)', () => {
    expect(canEditUser({ role: 'admin' }, { role: 'cashier' })).toBe(true)
  })

  it('un cajero NO puede editar a un admin (nivel mayor)', () => {
    expect(canEditUser({ role: 'cashier' }, { role: 'admin' })).toBe(false)
  })

  it('un usuario puede editar a otro de su mismo nivel', () => {
    expect(canEditUser({ role: 'admin' }, { role: 'admin' })).toBe(true)
  })

  it('devuelve false si falta información de rol', () => {
    expect(canEditUser(null, { role: 'cashier' })).toBe(false)
    expect(canEditUser({ role: 'admin' }, null)).toBe(false)
  })
})