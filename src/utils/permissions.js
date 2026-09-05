// Sistema de permisos
export const PERMISSIONS = {
  viewer:     { canEditProducts: false, canDeleteProducts: false, canManageCategories: false, canManageSuppliers: false, canViewSuppliers: false, canDiscount: false, canViewFullReports: false, canViewCosts: false, canAccessSettings: false, canManageUsers: false, canViewUsers: false, canViewCreditAccounts: false },
  cashier:    { canEditProducts: false, canDeleteProducts: false, canManageCategories: false, canManageSuppliers: false, canViewSuppliers: false, canDiscount: false, canViewFullReports: false, canViewCosts: false, canAccessSettings: false, canManageUsers: false, canViewUsers: false, canViewCreditAccounts: false },
  supervisor: { canEditProducts: true,  canDeleteProducts: false, canManageCategories: false, canManageSuppliers: false, canViewSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: false, canManageUsers: false, canViewUsers: true,  canViewCreditAccounts: true },
  admin:      { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canManageSuppliers: true,  canViewSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canViewUsers: true,  canViewCreditAccounts: true },
  owner:      { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canManageSuppliers: true,  canViewSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canViewUsers: true,  canViewCreditAccounts: true },
  superadmin: { canEditProducts: true,  canDeleteProducts: true,  canManageCategories: true,  canManageSuppliers: true,  canViewSuppliers: true,  canDiscount: true,  canViewFullReports: true,  canViewCosts: true,  canAccessSettings: true,  canManageUsers: true, canViewUsers: true,  canManageAllTenants: true, canViewCreditAccounts: true },
}

export const ROLE_LABELS = {
  viewer:     { label: 'Visor',         color: '#6c757d' },
  cashier:    { label: 'Cajero',        color: '#e94560' },
  supervisor: { label: 'Supervisor',    color: '#ffc107' },
  admin:      { label: 'Administrador', color: '#00d9a5' },
  owner:      { label: 'Propietario',   color: '#3b82f6' },
  superadmin: { label: 'Super Admin',   color: '#8b5cf6' },
}

// Jerarquía de roles (valor numérico para comparación)
export const ROLE_HIERARCHY = {
  viewer: 1,
  cashier: 2, 
  supervisor: 3,
  admin: 4,
  owner: 5,
  superadmin: 6
}

// Roles que cada usuario puede crear (nivel igual o menor)
export const USER_CREATION_PERMISSIONS = {
  viewer: [],                         // No puede crear usuarios
  cashier: ['viewer'],                // Puede crear: viewer
  supervisor: ['viewer', 'cashier'],  // Puede crear: viewer, cashier  
  admin: ['viewer', 'cashier', 'supervisor'],      // Puede crear: viewer, cashier, supervisor
  owner: ['viewer', 'cashier', 'supervisor'],      // Puede crear: viewer, cashier, supervisor
  superadmin: ['viewer', 'cashier', 'supervisor', 'admin', 'owner'] // Puede crear cualquier usuario
}

export function can(user, permission) {
  if (!user) return false
  return PERMISSIONS[user.role]?.[permission] ?? false
}

// Obtener los roles que un usuario puede crear
export function getCreatableRoles(user) {
  if (!user?.role) return []
  return USER_CREATION_PERMISSIONS[user.role] || []
}

// Verificar si un usuario puede crear un rol específico
export function canCreateRole(user, targetRole) {
  if (!user?.role || !targetRole) return false
  const creatableRoles = getCreatableRoles(user)
  return creatableRoles.includes(targetRole)
}

// Verificar si un usuario puede editar otro usuario (nivel igual o menor)
export function canEditUser(currentUser, targetUser) {
  if (!currentUser?.role || !targetUser?.role) return false
  
  const currentLevel = ROLE_HIERARCHY[currentUser.role] || 0
  const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0
  
  return currentLevel >= targetLevel
}
