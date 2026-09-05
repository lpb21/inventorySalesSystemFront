import { useState } from 'react'
import { Settings, Save, Upload, KeyRound } from 'lucide-react'
import { can } from '../../utils/permissions'
import ImportModal from '../inventory/ImportModal'
import { useGlobalContext } from '../../context/GlobalContext'
import { useUsers } from '../../hooks/useUsers'
import { useCustomers, useCustomerMutations } from '../../hooks/queries/useCustomers'
import { useSuppliers } from '../../hooks/queries/useSuppliers'
import { useCategories } from '../../hooks/queries/useCategories'
import { useProducts } from '../../hooks/queries/useProducts'
import { useSupplierManagement } from '../../hooks/useSupplierManagement'
import { useCategoryManagement } from '../../hooks/useCategoryManagement'
import UserModal from '../shared/UserModal'
import CustomerModal from '../shared/CustomerModal'
import SupplierModal from '../inventory/SupplierModal'
import CategoryModal from '../inventory/CategoryModal'
import ChangePasswordModal from './ChangePasswordModal'
import ResetPasswordModal from './ResetPasswordModal'
import UsersSection from './UsersSection'
import CustomersSection from './CustomersSection'
import SuppliersSection from './SuppliersSection'
import CategoriesSection from './CategoriesSection'
import SubscriptionSection from './SubscriptionSection'
import { suppliersAPI } from '../../api/config'

function SettingsView() {
  const {
    currentUser,
    users,
    businessData,
    addToast,
    loadUsers
  } = useGlobalContext()

  // Estados para toggles de visualización
  const [showInactiveSuppliers, setShowInactiveSuppliers] = useState(false)
  const [showInactiveCategories, setShowInactiveCategories] = useState(false)
  const [showInactiveCustomers, setShowInactiveCustomers] = useState(false)

  // Cargar datos
  const { data: categories = [] } = useCategories({ includeInactive: showInactiveCategories })
  const { data: customers = [] } = useCustomers({ isActive: showInactiveCustomers ? false : true })
  const { data: suppliers = [] } = useSuppliers({ includeInactive: showInactiveSuppliers })
  const { refetch: loadProducts } = useProducts()

  // Estados de modales
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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetingUser, setResetingUser] = useState(null)

  // Hooks de gestión
  const { saveUser, toggleUserStatus } = useUsers({
    addToast,
    loadUsers,
    editingUser,
    setEditingUser,
    setShowUserModal
  })

  const { createCustomer, updateCustomer, deleteCustomer } = useCustomerMutations()
  const {
    toggleSupplierStatus,
    refreshSuppliers,
    extractSupplierFromResponse,
    upsertSupplierInCache
  } = useSupplierManagement(addToast)

  const { toggleCategoryStatus, saveCategory } = useCategoryManagement(addToast)

  // Handlers
  const handleToggleCustomerStatus = async (customer) => {
    const newStatus = !customer.is_active
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: { ...customer, is_active: newStatus }
      })
      addToast(
        newStatus ? 'Cliente activado' : 'Cliente desactivado',
        'success'
      )
    } catch (error) {
      addToast('Error al cambiar estado del cliente', 'error')
    }
  }

  const handleSaveSupplier = async (supplierData) => {
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
        success: false,
        message: msg,
        formErrors: details.length ? details : null,
        validationErrors: isValidation && Array.isArray(errorData?.error?.details) ? errorData.error.details : null
      }
    } finally {
      setIsSavingSupplier(false)
    }
  }

  const handleSaveCategory = async (categoryData) => {
    const success = await saveCategory(categoryData, Boolean(editingCategory))
    if (success) {
      setShowCategoryModal(false)
      setEditingCategory(null)
    }
  }

  const handleSaveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, data: customerData })
        addToast('Cliente actualizado', 'success')
      } else {
        await createCustomer.mutateAsync(customerData)
        addToast('Cliente creado', 'success')
      }
      setShowCustomerModal(false)
      setEditingCustomer(null)
    } catch (error) {
      addToast('Error al guardar cliente', 'error')
      throw error
    }
  }

  // Función helper para obtener datos del negocio desde múltiples fuentes
  const getBusinessInfo = () => {
    if (businessData?.name) {
      return {
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone
      }
    }

    if (currentUser?.tenant?.name) {
      return {
        name: currentUser.tenant.name,
        address: currentUser.tenant.address,
        phone: currentUser.tenant.phone
      }
    }

    if (currentUser?.business_name) {
      return {
        name: currentUser.business_name,
        address: currentUser.business_address,
        phone: currentUser.business_phone
      }
    }

    return null
  }

  const businessInfo = getBusinessInfo()
  const businessName = businessInfo?.name || 'Mi Negocio'
  const businessAddress = businessInfo?.address || 'Sin dirección'
  const businessPhone = businessInfo?.phone || 'Sin teléfono'
  const maxUsers = currentUser?.tenant?.limits?.maxUsers

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
        {/* Datos del Negocio */}
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary">
              <Save size={18} />
              Guardar Cambios
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowChangePasswordModal(true)}
              title="Cambiar mi contraseña"
            >
              <KeyRound size={18} />
              Cambiar mi Contraseña
            </button>
          </div>
        </div>

        {/* Gestión de Datos */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gestión de Datos</h3>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '12px' }}
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={18} />
            Importar Productos (CSV)
          </button>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Importa múltiples productos desde un archivo CSV. El sistema creará automáticamente
            las categorías y proveedores que no existan.
          </p>
        </div>
      </div>

      {/* Planes y Suscripción (ePayco) */}
      <SubscriptionSection />

      {/* Secciones de entidades */}
      <div style={{ marginTop: '24px' }}>
        <UsersSection
          currentUser={currentUser}
          users={users}
          maxUsers={maxUsers}
          onAddUser={() => {
            setEditingUser(null)
            setShowUserModal(true)
          }}
          onEditUser={(user) => {
            setEditingUser(user)
            setShowUserModal(true)
          }}
          onToggleStatus={toggleUserStatus}
          onResetPassword={(user) => {
            setResetingUser(user)
            setShowResetPasswordModal(true)
          }}
        />
      </div>

      <div style={{ marginTop: '24px' }}>
        <CustomersSection
          currentUser={currentUser}
          customers={customers}
          showInactive={showInactiveCustomers}
          onToggleShowInactive={setShowInactiveCustomers}
          onAddCustomer={() => {
            setEditingCustomer(null)
            setShowCustomerModal(true)
          }}
          onEditCustomer={(customer) => {
            setEditingCustomer(customer)
            setShowCustomerModal(true)
          }}
          onToggleStatus={handleToggleCustomerStatus}
        />
      </div>

      <div style={{ marginTop: '24px' }}>
        <SuppliersSection
          currentUser={currentUser}
          suppliers={suppliers}
          showInactive={showInactiveSuppliers}
          onToggleShowInactive={setShowInactiveSuppliers}
          onAddSupplier={() => {
            setEditingSupplier(null)
            setShowSupplierModal(true)
          }}
          onEditSupplier={(supplier) => {
            setEditingSupplier(supplier)
            setShowSupplierModal(true)
          }}
          onToggleStatus={toggleSupplierStatus}
        />
      </div>

      <div style={{ marginTop: '24px' }}>
        <CategoriesSection
          currentUser={currentUser}
          categories={categories}
          showInactive={showInactiveCategories}
          onToggleShowInactive={setShowInactiveCategories}
          onAddCategory={() => {
            setEditingCategory(null)
            setShowCategoryModal(true)
          }}
          onEditCategory={(category) => {
            setEditingCategory(category)
            setShowCategoryModal(true)
          }}
          onToggleStatus={toggleCategoryStatus}
        />
      </div>

      {/* Modales */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false)
            loadProducts()
          }}
        />
      )}

      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          user={editingUser}
          onSave={saveUser}
          onClose={() => {
            setShowUserModal(false)
            setEditingUser(null)
          }}
          currentUser={currentUser}
        />
      )}

      {showCustomerModal && (
        <CustomerModal
          isOpen={showCustomerModal}
          editingCustomer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowCustomerModal(false)
            setEditingCustomer(null)
          }}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          isOpen={showSupplierModal}
          editingSupplier={editingSupplier}
          onSave={handleSaveSupplier}
          onClose={() => {
            setShowSupplierModal(false)
            setEditingSupplier(null)
          }}
          isSaving={isSavingSupplier}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          onClose={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
          }}
          onSave={handleSaveCategory}
          category={editingCategory}
        />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}

      {showResetPasswordModal && (
        <ResetPasswordModal
          user={resetingUser}
          onClose={() => {
            setShowResetPasswordModal(false)
            setResetingUser(null)
          }}
        />
      )}
    </div>
  )
}

export default SettingsView
