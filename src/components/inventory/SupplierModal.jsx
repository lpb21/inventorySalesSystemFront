import { useState, useEffect } from 'react'
import { X, Save, Loader, Building2 } from 'lucide-react'

function SupplierModal({ 
  isOpen, 
  onClose, 
  onSave,
  editingSupplier = null,
  isSaving = false 
}) {
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (editingSupplier) {
        setFormData({
          name: editingSupplier.name || '',
          contact_name: editingSupplier.contact_name || '',
          document: editingSupplier.document || '',
          email: editingSupplier.email || '',
          phone: editingSupplier.phone || '',
          address: editingSupplier.address || '',
          notes: editingSupplier.notes || ''
        })
      } else {
        setFormData({
          name: '',
          contact_name: '',
          document: '',
          email: '',
          phone: '',
          address: '',
          notes: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, editingSupplier])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del proveedor es obligatorio'
    }

    // Validar email si se proporciona
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    const supplierData = {
      ...formData,
      name: formData.name.trim(),
      contact_name: formData.contact_name.trim() || null,
      document: formData.document.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      notes: formData.notes.trim() || null
    }

    await onSave(supplierData)
  }

  const handleClose = () => {
    if (isSaving) return
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} style={{ color: '#3b82f6' }} />
            </div>
            <h3 className="modal-title">
              {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h3>
          </div>
          <button className="modal-close" onClick={handleClose} disabled={isSaving}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">
                Nombre del Proveedor *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSaving}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Ej: Samsung Electronics"
              />
              {errors.name && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>
              )}
            </div>

            {/* Nombre de contacto */}
            <div className="form-group">
              <label className="form-label">
                Nombre de Contacto
              </label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                disabled={isSaving}
                className="form-input"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Documento */}
            <div className="form-group">
              <label className="form-label">
                Documento/RUC
              </label>
              <input
                type="text"
                name="document"
                value={formData.document}
                onChange={handleChange}
                disabled={isSaving}
                className="form-input"
                placeholder="Ej: 20123456789"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSaving}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="contacto@proveedor.com"
              />
              {errors.email && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="form-group">
              <label className="form-label">
                Teléfono
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSaving}
                className="form-input"
                placeholder="Ej: +51 999 999 999"
              />
            </div>

            {/* Dirección */}
            <div className="form-group">
              <label className="form-label">
                Dirección
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isSaving}
                className="form-input"
                placeholder="Dirección del proveedor"
              />
            </div>

            {/* Notas */}
            <div className="form-group">
              <label className="form-label">
                Notas
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isSaving}
                className="form-input"
                placeholder="Notas adicionales sobre el proveedor..."
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SupplierModal
