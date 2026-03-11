// Sistema de permisos
export const PERMISSIONS = {
  cashier:    { canEditProducts: false, canDeleteProducts: false, canManageCategories: false, canManageSuppliers: false, canDiscount: false, canViewFullReports: false, canViewCosts: false, canAccessSettings: false, canManageUsers: false, canViewCreditAccounts: false },
  supervisor: { canEditProducts: true,  canDeleteProducts: false, canManageCategories: true,  canManageSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: false, canManageUsers: false, canViewCreditAccounts: true },
  admin:      { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canManageSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canViewCreditAccounts: true },
  owner:      { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canManageSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canViewCreditAccounts: true },
  superadmin: { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canManageSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canManageAllTenants: true, canViewCreditAccounts: true },
}

export const ROLE_LABELS = {
  cashier:    { label: 'Cajero',        color: '#e94560' },
  supervisor: { label: 'Supervisor',    color: '#ffc107' },
  admin:      { label: 'Administrador', color: '#00d9a5' },
  owner:      { label: 'Propietario',   color: '#3b82f6' },
  superadmin: { label: 'Super Admin',   color: '#8b5cf6' },
}

export function can(user, permission) {
  if (!user) return false
  return PERMISSIONS[user.role]?.[permission] ?? false
}
