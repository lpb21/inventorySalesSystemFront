import { useState } from 'react'
import { Plus, Edit, Building2, Mail, Phone, MapPin, FileText, Power } from 'lucide-react'
import { can } from '../../utils/permissions'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSuppliers, useSupplierMutations } from '../../hooks/queries/useSuppliers'
import { suppliersAPI } from '../../api/config'
import { useQueryClient } from '@tanstack/react-query'
import SupplierModal from '../inventory/SupplierModal'
import Swal from 'sweetalert2'

function SuppliersView({ searchTerm = '' }) {
  const { currentUser, addToast } = useGlobalContext()

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier]     = useState(null)
  const [isSaving, setIsSaving]                   = useState(false)
  const [showInactive, setShowInactive]           = useState(false)

  // ── React Query ────────────────────────────────────────────────────────────
  const queryClient = useQueryClient()
  const { data: suppliers = [] } = useSuppliers({ includeInactive: showInactive })

  // Solo usamos las mutaciones de toggle para activar/desactivar
  const {
    deactivateSupplier: deactivateSupplierMutation,
    reactivateSupplier: reactivateSupplierMutation
  } = useSupplierMutations()

  const canEdit = can(currentUser, 'canManageSuppliers') || can(currentUser, 'canManageCategories') || can(currentUser, 'canEditProducts')

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

  // ── Parser de errores de validación ───────────────────────────────────────

  const parseValidationError = (errorData) => {
    if (errorData?.error?.code !== 'VALIDATION_ERROR') return null

    const details = errorData?.error?.details
    const stringDetails = Array.isArray(details) ? details.filter(d => typeof d === 'string') : []

    const fieldMap = {
      nombre: 'name', proveedor: 'name',
      contacto: 'contact_name',
      documento: 'document', ruc: 'document',
      email: 'email', correo: 'email',
      telefono: 'phone',
      direccion: 'address',
      notas: 'notes'
    }

    const normalize = (str) =>
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    const fieldErrors = {}
    stringDetails.forEach(detail => {
      const match = normalize(detail).match(/campo\s+([a-z_\s]+?)\s+es\s+obligatorio/)
      if (match?.[1]) {
        const key = fieldMap[normalize(match[1])]
        if (key) fieldErrors[key] = detail
      }
    })

    return {
      message:     errorData?.error?.message || 'Error de validación',
      formErrors:  stringDetails.length ? stringDetails : null,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : null
    }
  }

  // ── onSave: llama directo a suppliersAPI para preservar error.response.data ─

  const handleSaveSupplier = async (supplierData) => {
    setIsSaving(true)

    // Extraer solo los campos que el backend espera — sin id ni otros campos extra
    const { name, contact_name, document, email, phone, address, notes } = supplierData
    const payload = { name, contact_name, document, email, phone, address, notes }

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
      // apiRequest lanza siempre en HTTP !2xx con error.response = { status, data }
      const errorData = error?.response?.data
      const validation = parseValidationError(errorData)

      if (validation) {
        addToast(validation.message, 'error')
        return {
          success:     false,
          message:     validation.message,
          formErrors:  validation.formErrors,
          fieldErrors: validation.fieldErrors
        }
      }

      // Error genérico
      const msg = errorData?.error?.message || errorData?.message || error?.message || 'Error al guardar proveedor'
      addToast(msg, 'error')
      return { success: false, message: msg, formErrors: null, fieldErrors: null }

    } finally {
      setIsSaving(false)
    }
  }

  // ── Toggle activo/inactivo ─────────────────────────────────────────────────

  const handleToggleStatus = async (supplier) => {
    const isActive = supplier.is_active !== false

    const result = await Swal.fire({
      title: `¿${isActive ? 'Desactivar' : 'Activar'} proveedor?`,
      html: `
        <p style="color: var(--text-secondary); margin-bottom: 8px;">
          El proveedor <strong>${supplier.name}</strong> será ${isActive ? 'desactivado' : 'activado'}.
        </p>
        ${isActive
          ? '<p style="color: var(--text-secondary); font-size: 14px;">Los productos asociados ya no aparecerán en el inventario.</p>'
          : '<p style="color: var(--text-secondary); font-size: 14px;">El proveedor volverá a aparecer en el inventario.</p>'
        }
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor:  isActive ? '#e94560' : '#00d9a5',
      cancelButtonColor:   '#6b7280',
      confirmButtonText:   isActive ? 'Sí, desactivar' : 'Sí, activar',
      cancelButtonText:    'Cancelar',
      background: '#1a1f2e',
      color:      '#e6edf3'
    })

    if (!result.isConfirmed) return

    try {
      if (isActive) {
        await deactivateSupplierMutation.mutateAsync(supplier.id)
        addToast('Proveedor desactivado', 'success')
      } else {
        await reactivateSupplierMutation.mutateAsync(supplier.id)
        addToast('Proveedor activado', 'success')
      }
    } catch (error) {
      const msg = error?.response?.data?.error?.message
        || `Error al ${isActive ? 'desactivar' : 'activar'} proveedor`
      addToast(msg, 'error')
    }
  }

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Proveedores
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border)' }}>
            {[{ label: 'Activos', val: false }, { label: 'Todos', val: true }].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setShowInactive(val)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none',
                  background: showInactive === val ? 'var(--accent)' : 'transparent',
                  color:      showInactive === val ? 'white'         : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={() => { setEditingSupplier(null); setShowSupplierModal(true) }}
            >
              <Plus size={18} /> Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {/* Lista vacía */}
      {filteredSuppliers.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)'
        }}>
          <Building2 size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {searchTerm
              ? `No hay proveedores que coincidan con "${searchTerm}"`
              : 'Comienza agregando tu primer proveedor'}
          </p>
          {canEdit && !searchTerm && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => { setEditingSupplier(null); setShowSupplierModal(true) }}
            >
              <Plus size={16} /> Crear Proveedor
            </button>
          )}
        </div>

      ) : (
        <div className="suppliers-grid">
          <style>{`
            .suppliers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
            .supplier-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: all 0.2s ease; }
            .supplier-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
            .supplier-card.inactive { opacity: 0.6; }
            .supplier-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
            .supplier-icon { background: rgba(59,130,246,0.1); border-radius: 10px; padding: 12px; flex-shrink: 0; }
            .supplier-info { flex: 1; min-width: 0; }
            .supplier-name { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0; word-break: break-word; }
            .supplier-contact { font-size: 14px; color: var(--text-secondary); margin: 0; }
            .supplier-details { display: flex; flex-direction: column; gap: 8px; }
            .supplier-detail { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
            .supplier-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
          `}</style>

          {filteredSuppliers.map(supplier => (
            <div key={supplier.id} className={`supplier-card ${supplier.is_active === false ? 'inactive' : ''}`}>
              <div className="supplier-header">
                <div className="supplier-icon">
                  <Building2 size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div className="supplier-info">
                  <h3 className="supplier-name">{supplier.name}</h3>
                  {supplier.contact_name && (
                    <p className="supplier-contact">Contacto: {supplier.contact_name}</p>
                  )}
                </div>
              </div>

              <div className="supplier-details">
                {supplier.email    && <div className="supplier-detail"><Mail     size={14}/><span>{supplier.email}</span></div>}
                {supplier.phone    && <div className="supplier-detail"><Phone    size={14}/><span>{supplier.phone}</span></div>}
                {supplier.document && <div className="supplier-detail"><FileText size={14}/><span>RUC/Doc: {supplier.document}</span></div>}
                {supplier.address  && <div className="supplier-detail"><MapPin   size={14}/><span>{supplier.address}</span></div>}
                {supplier.notes    && (
                  <div className="supplier-detail">
                    <FileText size={14}/>
                    <span style={{ fontStyle: 'italic' }}>
                      {supplier.notes.length > 60 ? `${supplier.notes.substring(0, 60)}...` : supplier.notes}
                    </span>
                  </div>
                )}
                {supplier.products_count !== undefined && (
                  <div className="supplier-detail">
                    <span style={{ fontWeight: 500 }}>
                      {supplier.products_count} producto{supplier.products_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="supplier-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => { setEditingSupplier(supplier); setShowSupplierModal(true) }}
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      flex: '0 0 auto',
                      background: supplier.is_active === false ? 'rgba(0,217,165,0.15)' : 'rgba(233,69,96,0.15)',
                      border: `1px solid ${supplier.is_active === false ? 'var(--success)' : 'var(--danger)'}`,
                      color:  supplier.is_active === false ? 'var(--success)' : 'var(--danger)'
                    }}
                    onClick={() => handleToggleStatus(supplier)}
                    title={supplier.is_active === false ? 'Activar proveedor' : 'Desactivar proveedor'}
                  >
                    <Power size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showSupplierModal && (
        <SupplierModal
          isOpen={showSupplierModal}
          editingSupplier={editingSupplier}
          onSave={handleSaveSupplier}
          isSaving={isSaving}
          onClose={() => { setShowSupplierModal(false); setEditingSupplier(null) }}
        />
      )}
    </div>
  )
}

export default SuppliersView
