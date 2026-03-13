import { useState } from 'react'
import { Settings, Users, User, Edit, Trash2, Plus, Save, Download, Upload, Package2, Phone, Mail, Ban, CheckCircle, AlertTriangle, Eye, EyeOff, Building2 } from 'lucide-react'
import { can, ROLE_LABELS, getCreatableRoles, canEditUser } from '../../utils/permissions'
import ImportModal from '../inventory/ImportModal'
import { ICON_OPTIONS } from '../inventory/CategoryModal'
import { useGlobalContext } from '../../context/GlobalContext'
import { useUsers } from '../../hooks/useUsers'
import { useCustomers, useCustomerMutations } from '../../hooks/queries/useCustomers'
import { useSuppliers, useSupplierMutations } from '../../hooks/queries/useSuppliers'
import { useCategories, useCategoryMutations } from '../../hooks/queries/useCategories'
import { useProducts } from '../../hooks/queries/useProducts'
import UserModal from '../shared/UserModal'
import CustomerModal from '../shared/CustomerModal'
import SupplierModal from '../inventory/SupplierModal'
import CategoryModal from '../inventory/CategoryModal'
import { categoriesAPI, suppliersAPI } from '../../api/config'
import { useQueryClient } from '@tanstack/react-query'

function SettingsView() {
  const {
    currentUser,
    users,
    businessData,
    addToast,
    loadUsers
  } = useGlobalContext()

  const [showInactiveSuppliers, setShowInactiveSuppliers] = useState(false)
  const [showInactiveCategories, setShowInactiveCategories] = useState(false)
  
  const { data: categories = [] } = useCategories({ includeInactive: showInactiveCategories })
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers({ includeInactive: showInactiveSuppliers })
  const { refetch: loadProducts } = useProducts()

  const [showImportModal, setShowImportModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [isSavingSupplier, setIsSavingSupplier] = useState(false)

  const {
    saveUser,
    toggleUserStatus
  } = useUsers({ 
    addToast, 
    loadUsers, 
    editingUser, 
    setEditingUser, 
    setShowUserModal 
  })

  const { createCustomer: saveCustomer, deleteCustomer } = useCustomerMutations()
  const { createSupplier: saveSupplier, deactivateSupplier, reactivateSupplier } = useSupplierMutations()
  const { createCategory, updateCategory, deactivateCategory, reactivateCategory } = useCategoryMutations()
  
  const toggleSupplierStatus = (supplier) => {
    if (supplier.is_active === false) {
      reactivateSupplier.mutate(supplier.id)
    } else {
      deactivateSupplier.mutate(supplier.id)
    }
  }

  const queryClient = useQueryClient()

  const refreshSuppliers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    await queryClient.refetchQueries({ queryKey: ['suppliers'], type: 'active' })
  }

  const extractSupplierFromResponse = (result) => {
    if (!result) return null
    if (result?.data?.supplier) return result.data.supplier
    if (result?.supplier) return result.supplier
    if (result?.id) return result
    return null
  }

  const upsertSupplierInCache = (supplier, isEdit) => {
    if (!supplier?.id) return

    queryClient.setQueriesData({ queryKey: ['suppliers'] }, (old = []) => {
      if (!Array.isArray(old)) return old

      if (isEdit) {
        return old.map((item) => (item.id === supplier.id ? { ...item, ...supplier } : item))
      }

      const exists = old.some((item) => item.id === supplier.id)
      if (exists) return old
      return [supplier, ...old]
    })
  }

  const handleSaveCategory = async (categoryData) => {
    try {
      if (categoryData.id) {
        await updateCategory.mutateAsync({ id: categoryData.id, data: { name: categoryData.name, description: categoryData.description || '', icon: categoryData.icon || 'package' } })
        addToast('Categoría editada con éxito', 'success')
      } else {
        await createCategory.mutateAsync({ name: categoryData.name, description: categoryData.description || '', icon: categoryData.icon || 'package' })
        addToast('Categoría creada', 'success')
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
    } catch (error) {
      const errorResponse = error.response?.data
      if (errorResponse && errorResponse.success === false && errorResponse.error?.message) {
        addToast(errorResponse.error.message, 'error')
      } else {
        addToast(categoryData.id ? 'Error al editar categoría' : 'Error al crear categoría', 'error')
      }
    }
  }

  const handleToggleCategoryStatus = async (category) => {
    try {
      if (category.is_active === false) {
        await reactivateCategory.mutateAsync(category.id)
        addToast('Categoría activada', 'success')
      } else {
        await deactivateCategory.mutateAsync(category.id)
        addToast('Categoría desactivada', 'success')
      }
    } catch (error) {
      const errorResponse = error.response?.data
      if (errorResponse && errorResponse.success === false && errorResponse.error?.message) {
        addToast(errorResponse.error.message, 'error')
      } else {
        addToast('Error al cambiar estado de categoría', 'error')
      }
    }
  }

  const handleToggleInactiveSuppliers = (show) => {
    setShowInactiveSuppliers(show)
  }

  const handleToggleInactiveCategories = (show) => {
    setShowInactiveCategories(show)
  }

  const canManageUsers = can(currentUser, 'canManageUsers')
  const canCreateUsers = canManageUsers && getCreatableRoles(currentUser).length > 0
  
  // Función helper para obtener datos del negocio desde múltiples fuentes
  const getBusinessInfo = () => {
    // 1. businessData pasado como prop (del tenant API en App.jsx)
    if (businessData?.name) {
      return {
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone
      }
    }
    
    // 2. currentUser.tenant (datos del tenant incluidos en el usuario desde auth/me)
    if (currentUser?.tenant?.name) {
      return {
        name: currentUser.tenant.name,
        address: currentUser.tenant.address,
        phone: currentUser.tenant.phone
      }
    }
    
    // 3. currentUser directo (para backward compatibility - campos directos en el usuario)
    if (currentUser?.business_name) {
      return {
        name: currentUser.business_name,
        address: currentUser.business_address,
        phone: currentUser.business_phone
      }
    }
    
    // Valores por defecto
    return null
  }
  
  // Obtener los datos del negocio
  const businessInfo = getBusinessInfo()
  const businessName = businessInfo?.name || 'Mi Negocio'
  const businessAddress = businessInfo?.address || 'Sin dirección'
  const businessPhone = businessInfo?.phone || 'Sin teléfono'


  if (!can(currentUser, 'canAccessSettings')) {
    return (
      <div className="empty-state" style={{ padding: '80px', textAlign: 'center' }}>
        <Settings size={64} style={{ opacity: 0.3, marginBottom: '24px' }} />
        <h3 style={{ marginBottom: '12px' }}>Acceso Restringido</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          No tienes permisos para acceder a la configuración del sistema.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Datos del Negocio</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre del Negocio</label>
            <input type="text" className="form-input" defaultValue={businessName} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input type="text" className="form-input" defaultValue={businessAddress} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input type="text" className="form-input" defaultValue={businessPhone} />
          </div>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input type="text" className="form-input" defaultValue={currentUser?.name || 'Usuario'} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="text" className="form-input" defaultValue={currentUser?.email || 'Sin email'} disabled style={{ opacity: 0.7 }} />
          </div>
          <button className="btn btn-primary">
            <Save size={18} />
            Guardar Cambios
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestión de Datos</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <Download size={18} />
              Exportar Datos (JSON)
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setShowImportModal(true)}>
              <Upload size={18} />
              Importar Productos CSV
            </button>
          </div>
        </div>
      </div>

      {/* Gestión de Clientes */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Gestión de Clientes</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingCustomer(null); setShowCustomerModal(true) }}>
            <User size={16} />
            Nuevo Cliente
          </button>
        </div>
        {customers.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <Users size={48} />
            <h4>Sin clientes</h4>
            <p>No hay clientes registrados aún</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Límite de Crédito</th>
                  <th>Deuda Actual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {customer.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'C'}
                        </div>
                        {customer.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {customer.phone && <div><Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />{customer.phone}</div>}
                        {customer.email && <div><Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />{customer.email}</div>}
                        {!customer.phone && !customer.email && <span>Sin contacto</span>}
                      </div>
                    </td>
                    <td>${(customer.credit_limit || 0).toLocaleString()}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: (customer.credit_balance || 0) > 0 ? 'rgba(233, 69, 96, 0.15)' : 'rgba(0, 217, 165, 0.15)',
                        color: (customer.credit_balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'
                      }}>
                        ${(customer.credit_balance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => { setEditingCustomer(customer); setShowCustomerModal(true) }}
                          title="Editar cliente"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => {
                            if (window.confirm('¿Seguro que deseas eliminar este cliente?')) {
                              deleteCustomer.mutate(customer.id)
                            }
                          }}
                          title="Eliminar cliente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gestión de Proveedores */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="card-title">Gestión de Proveedores</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleToggleInactiveSuppliers(!showInactiveSuppliers)}
            >
              {showInactiveSuppliers ? <EyeOff size={16} /> : <Eye size={16} />}
              {showInactiveSuppliers ? 'Ocultar Inactivos' : 'Proveedores Inactivos'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingSupplier(null); setShowSupplierModal(true) }}>
              <Building2 size={16} />
              Nuevo Proveedor
            </button>
          </div>
        </div>
        {suppliers.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <Building2 size={48} />
            <h4>Sin proveedores</h4>
            <p>No hay proveedores registrados aún</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Contacto</th>
                  <th>Documento</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(supplier => (
                  <tr key={supplier.id} style={{ 
                    opacity: supplier.is_active === false ? 0.6 : 1,
                    background: supplier.is_active === false ? 'rgba(233, 69, 96, 0.05)' : 'transparent'
                  }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: supplier.is_active === false ? 'rgba(233, 69, 96, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          border: supplier.is_active === false ? '1px solid rgba(233, 69, 96, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: supplier.is_active === false ? '#e94560' : '#3b82f6'
                        }}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ 
                            fontWeight: '500',
                            color: supplier.is_active === false ? 'var(--text-secondary)' : 'var(--text-primary)'
                          }}>
                            {supplier.name}
                            {supplier.is_active === false && (
                              <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold', marginLeft: '8px' }}>INACTIVO</span>
                            )}
                          </div>
                          {supplier.contact_name && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {supplier.contact_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {supplier.phone && <div><Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />{supplier.phone}</div>}
                        {supplier.address && (
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>
                            {supplier.address.length > 30 
                              ? `${supplier.address.substring(0, 30)}...`
                              : supplier.address
                            }
                          </div>
                        )}
                        {!supplier.phone && !supplier.address && <span>Sin contacto</span>}
                      </div>
                    </td>
                    <td>
                      {supplier.document ? (
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '12px', 
                          background: 'var(--surface)', 
                          padding: '2px 6px', 
                          borderRadius: '4px' 
                        }}>
                          {supplier.document}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Sin documento</span>
                      )}
                    </td>
                    <td>
                      {supplier.email ? (
                        <span style={{ fontSize: '13px' }}>{supplier.email}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Sin email</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: supplier.is_active !== false ? 'rgba(0, 217, 165, 0.15)' : 'rgba(233, 69, 96, 0.15)',
                        color: supplier.is_active !== false ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {supplier.is_active !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => { setEditingSupplier(supplier); setShowSupplierModal(true) }}
                          title="Editar proveedor"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className={`btn btn-sm ${supplier.is_active !== false ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleSupplierStatus(supplier)}
                          title={supplier.is_active !== false ? 'Desactivar proveedor' : 'Activar proveedor'}
                          style={supplier.is_active === false ? { background: '#10b981', borderColor: '#10b981' } : {}}
                        >
                          {supplier.is_active !== false ? <Ban size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Gestión de Usuarios - Solo para admin/owner */}
      {canManageUsers && !canCreateUsers && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Gestión de Usuarios</h3>
          </div>
          <div className="empty-state" style={{ padding: '40px' }}>
            <Users size={48} />
            <h4>Sin permisos para crear usuarios</h4>
            <p>Tu rol actual no permite crear nuevos usuarios</p>
          </div>
        </div>
      )}

      {canCreateUsers && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Gestión de Usuarios</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingUser(null); setShowUserModal(true) }}>
              <User size={16} />
              Nuevo Usuario
            </button>
          </div>
          {users.filter(user => user.id !== currentUser.id).length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Users size={48} />
              <h4>Sin usuarios</h4>
              <p>No hay otros usuarios registrados aún</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Fecha de Creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(user => user.id !== currentUser.id).map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: ROLE_LABELS[user.role]?.color || 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {user.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U'}
                          </div>
                          {user.name}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: `${ROLE_LABELS[user.role]?.color}20`,
                          color: ROLE_LABELS[user.role]?.color || 'var(--text-secondary)'
                        }}>
                          {ROLE_LABELS[user.role]?.label || user.role}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: user.is_active ? 'rgba(0, 217, 165, 0.15)' : 'rgba(233, 69, 96, 0.15)',
                          color: user.is_active ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canEditUser(currentUser, user) && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => { setEditingUser(user); setShowUserModal(true) }}
                              title="Editar usuario"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {user.id !== currentUser.id && (
                            <button 
                              className={`btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              style={user.is_active ? {} : { background: '#10b981', borderColor: '#10b981' }}
                            >
                              {user.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="card-title">Categorías de Productos</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleToggleInactiveCategories(!showInactiveCategories)}
            >
              {showInactiveCategories ? <EyeOff size={16} /> : <Eye size={16} />}
              {showInactiveCategories ? 'Ocultar Inactivas' : 'Categorías Inactivas'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }}>
              <Plus size={16} />
              Nueva Categoría
            </button>
          </div>
        </div>
        {categories.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <Package2 size={48} style={{ opacity: 0.3 }} />
            <h4>Sin categorías</h4>
            <p>No hay categorías creadas aún</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '8px 0' }}>
            {categories
              .filter(cat => showInactiveCategories || cat.is_active !== false)
              .map(cat => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: cat.is_active === false ? 'rgba(233, 69, 96, 0.1)' : 'var(--background)',
                  border: '1px solid',
                  borderColor: cat.is_active === false ? 'var(--danger)' : 'var(--border)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: cat.is_active === false ? 0.7 : 1
                }}
              >
                {(() => {
                  const iconData = ICON_OPTIONS.find(i => i.name === cat.icon)
                  const IconComp = iconData ? iconData.icon : Package2
                  return <IconComp size={16} style={{ color: cat.is_active === false ? 'var(--danger)' : 'var(--accent)' }} />
                })()}
                {cat.name}
                {cat.is_active === false && (
                  <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold' }}>INACTIVA</span>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => { setEditingCategory(cat); setShowCategoryModal(true) }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title={`Editar categoría ${cat.name}`}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleCategoryStatus(cat)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: cat.is_active === false ? 'var(--success)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = cat.is_active === false ? 'var(--success)' : 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = cat.is_active === false ? 'var(--success)' : 'var(--text-secondary)'}
                    title={cat.is_active === false ? `Activar categoría ${cat.name}` : `Desactivar categoría ${cat.name}`}
                  >
                    {cat.is_active === false ? <CheckCircle size={14} /> : <Ban size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales locales */}
      {showUserModal && (
        <UserModal 
          user={editingUser}
          onSave={saveUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null) }}
        />
      )}

      {showCustomerModal && (
        <CustomerModal 
          customer={editingCustomer}
          onSave={async (data) => {
            try {
              if (editingCustomer) await saveCustomer.mutateAsync({ id: editingCustomer.id, data })
              else await saveCustomer.mutateAsync(data)
              setShowCustomerModal(false)
              setEditingCustomer(null)
            } catch (error) {}
          }}
          onClose={() => { setShowCustomerModal(false); setEditingCustomer(null) }}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          isOpen={showSupplierModal}
          editingSupplier={editingSupplier}
          onSave={async (supplierData) => {
            // Extraer solo los campos que el backend espera
            const { name, contact_name, document, email, phone, address, notes } = supplierData
            const payload = { name, contact_name, document, email, phone, address, notes }

            setIsSavingSupplier(true)
            try {
              let result
              if (editingSupplier) {
                result = await suppliersAPI.update(editingSupplier.id, payload)
                addToast('Proveedor actualizado', 'success')
              } else {
                result = await suppliersAPI.create(payload)
                addToast('Proveedor creado', 'success')
              }

              const savedSupplier = extractSupplierFromResponse(result)
              upsertSupplierInCache(savedSupplier, Boolean(editingSupplier))

              setShowSupplierModal(false)
              setEditingSupplier(null)
              
              await refreshSuppliers()
              return { success: true }

            } catch (error) {
              const errorData = error?.response?.data
              const isValidation = errorData?.error?.code === 'VALIDATION_ERROR'
              const details = isValidation ? (errorData?.error?.details ?? []).filter(d => typeof d === 'string') : []
              const msg = errorData?.error?.message || error?.message || 'Error al guardar proveedor'

              addToast(msg, 'error')
              return {
                success:     false,
                message:     msg,
                formErrors:  details.length ? details : null,
                fieldErrors: null
              }
            } finally {
              setIsSavingSupplier(false)
            }
          }}
          onClose={() => { setShowSupplierModal(false); setEditingSupplier(null) }}
          isSaving={isSavingSupplier}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null) }}
        />
      )}

      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={() => {
            loadProducts()
          }}
        />
      )}
    </div>
  )
}

export default SettingsView
