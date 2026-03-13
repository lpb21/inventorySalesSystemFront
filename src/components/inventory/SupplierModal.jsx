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

  // ============================================================
  // VALIDACIONES - Campos requeridos por backend: document, email, phone, address, notes
  // ============================================================

  const validarSoloLetras = (valor, campo) => {
    const trimmed = valor.trim()
    if (!trimmed) {
      return campo === 'name'
        ? { valid: false, message: 'El nombre del proveedor es obligatorio' }
        : { valid: true, message: '' } // contact_name es opcional
    }
    if (/\d/.test(trimmed)) {
      return { valid: false, message: 'Este campo no puede contener números' }
    }
    if (trimmed.length < 2) {
      return { valid: false, message: 'Debe tener al menos 2 caracteres' }
    }
    return { valid: true, message: '' }
  }

  const validarRequerido = (valor, campo) => {
    const trimmed = valor.trim()
    if (!trimmed) {
      return { valid: false, message: `El campo ${campo} es obligatorio` }
    }
    return { valid: true, message: '' }
  }

  const validarSoloNumeros = (valor) => {
    const soloNumeros = valor.replace(/\D/g, '')
    const validation = validarRequerido(soloNumeros, 'documento')
    if (!validation.valid) return validation
    if (soloNumeros.length < 7) {
      return { valid: false, message: 'Debe tener al menos 7 dígitos' }
    }
    return { valid: true, message: '' }
  }

  const validarEmail = (email) => {
    const trimmed = email.trim()
    const reqValidation = validarRequerido(trimmed, 'email')
    if (!reqValidation.valid) return reqValidation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { valid: false, message: 'El formato del email no es válido' }
    }
    return { valid: true, message: '' }
  }

  // ============================================================
  // TODOS LOS CAMPOS REQUERIDOS ESTÁN DILIGENCIADOS
  // Requeridos: name, document, email, phone, address, notes
  // ============================================================
  const formularioCompleto = () => {
    const sinErrores = Object.values(errors).every(e => !e)
    const nameValido     = validarSoloLetras(formData.name, 'name').valid
    const documentValido = validarSoloNumeros(formData.document).valid
    const emailValido    = validarEmail(formData.email).valid
    const phoneValido    = validarSoloNumeros(formData.phone).valid
    const addressValido  = validarRequerido(formData.address, 'dirección').valid
    const notesValido    = validarRequerido(formData.notes, 'notas').valid
    return sinErrores && nameValido && documentValido && emailValido && phoneValido && addressValido && notesValido
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target

    if (errors.form) {
      setErrors(prev => ({ ...prev, form: null }))
    }

    // Filtrado en tiempo real: solo letras para nombre y contacto
    if (name === 'name' || name === 'contact_name') {
      const soloLetras = value.replace(/\d/g, '')
      setFormData(prev => ({ ...prev, [name]: soloLetras }))
      const validation = validarSoloLetras(soloLetras, name)
      setErrors(prev => ({ ...prev, [name]: validation.valid ? null : validation.message }))
      return
    }

    // Filtrado en tiempo real: solo números para documento y teléfono
    if (name === 'document' || name === 'phone') {
      const soloNumeros = value.replace(/\D/g, '')
      setFormData(prev => ({ ...prev, [name]: soloNumeros }))
      const validation = validarSoloNumeros(soloNumeros)
      setErrors(prev => ({ ...prev, [name]: validation.valid ? null : validation.message }))
      return
    }

    // Email y resto de campos
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'email') {
      const validation = validarEmail(value)
      setErrors(prev => ({ ...prev, [name]: validation.valid ? null : validation.message }))
      return
    }

    // Limpiar error si existe
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target

    if (name === 'name' || name === 'contact_name') {
      const validation = validarSoloLetras(value, name)
      setErrors(prev => ({ ...prev, [name]: validation.valid ? null : validation.message }))
    }

    if (name === 'document' || name === 'phone') {
      const validation = validarSoloNumeros(value)
      setErrors(prev => ({ ...prev, [name]: validation.valid ? null : validation.message }))
    }

    if (name === 'email') {
      const validation = validarEmail(value)
      setErrors(prev => ({ ...prev, [name]: validation.valid ? null : validation.message }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar TODOS los campos requeridos antes de enviar al backend
    const nameV        = validarSoloLetras(formData.name, 'name')
    const contactNameV = validarSoloLetras(formData.contact_name, 'contact_name')
    const documentV    = validarSoloNumeros(formData.document)
    const phoneV       = validarSoloNumeros(formData.phone)
    const emailV       = validarEmail(formData.email)
    const addressV     = validarRequerido(formData.address, 'dirección')
    const notesV       = validarRequerido(formData.notes, 'notas')

    const newErrors = {
      name:         nameV.valid        ? null : nameV.message,
      contact_name: contactNameV.valid ? null : contactNameV.message,
      document:     documentV.valid    ? null : documentV.message,
      phone:        phoneV.valid       ? null : phoneV.message,
      email:        emailV.valid       ? null : emailV.message,
      address:      addressV.valid     ? null : addressV.message,
      notes:        notesV.valid       ? null : notesV.message,
    }

    setErrors(newErrors)

    const hayErrores = Object.values(newErrors).some(e => e)
    if (hayErrores) return

    // Enviar todos los campos siempre (el backend los requiere presentes)
    // Los opcionales van como string vacío si el usuario no los completó
    const supplierData = {
      name:         formData.name.trim(),
      contact_name: formData.contact_name.trim(),
      document:     formData.document.trim(),
      email:        formData.email.trim(),
      phone:        formData.phone.trim(),
      address:      formData.address.trim(),
      notes:        formData.notes.trim()
    }

    const result = await onSave(supplierData)

    if (result?.success === false) {
      if (result.fieldErrors && typeof result.fieldErrors === 'object') {
        setErrors(prev => ({ ...prev, ...result.fieldErrors }))
      }

      if (result.formErrors && Array.isArray(result.formErrors)) {
        setErrors(prev => ({ ...prev, form: result.formErrors }))
      } else if (result.message) {
        setErrors(prev => ({ ...prev, form: result.message }))
      }

      return
    }
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

            {errors.form && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--danger)',
                  background: 'rgba(233, 69, 96, 0.08)',
                  color: 'var(--danger)',
                  fontSize: '13px'
                }}
              >
                {Array.isArray(errors.form) ? (
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {errors.form.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                ) : errors.form}
              </div>
            )}

            {/* Nombre del Proveedor */}
            <div className="form-group">
              <label className="form-label">Nombre del Proveedor *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSaving}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Ej: Samsung Electronics"
                style={errors.name ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {}}
              />
              {errors.name && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>
              )}
            </div>

            {/* Nombre de Contacto */}
            <div className="form-group">
              <label className="form-label">Nombre de Contacto</label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSaving}
                className={`form-input ${errors.contact_name ? 'error' : ''}`}
                placeholder="Ej: Juan Pérez"
                style={errors.contact_name ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {}}
              />
              {errors.contact_name && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.contact_name}</p>
              )}
            </div>

            {/* Documento / RUC * */}
            <div className="form-group">
              <label className="form-label">Documento/RUC <span style={{color: 'var(--danger)'}}>*</span></label>
              <input
                type="text"
                name="document"
                value={formData.document}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSaving}
                className={`form-input ${errors.document ? 'error' : ''}`}
                placeholder="Ej: 20123456789"
                style={errors.document ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {}}
              />
              {errors.document && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.document}</p>
              )}
            </div>

            {/* Email * */}
            <div className="form-group">
              <label className="form-label">Email <span style={{color: 'var(--danger)'}}>*</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSaving}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="contacto@proveedor.com"
                style={errors.email ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {}}
              />
              {errors.email && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>
              )}
            </div>

            {/* Teléfono * */}
            <div className="form-group">
              <label className="form-label">Teléfono <span style={{color: 'var(--danger)'}}>*</span></label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSaving}
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="Ej: 3001234567"
                style={errors.phone ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {}}
              />
              {errors.phone && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.phone}</p>
              )}
            </div>

            {/* Dirección * */}
            <div className="form-group">
              <label className="form-label">Dirección <span style={{color: 'var(--danger)'}}>*</span></label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isSaving}
                className={`form-input ${errors.address ? 'error' : ''}`}
                placeholder="Dirección del proveedor"
                style={errors.address ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {}}
              />
              {errors.address && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.address}</p>
              )}
            </div>

            {/* Notas * */}
            <div className="form-group">
              <label className="form-label">Notas <span style={{color: 'var(--danger)'}}>*</span></label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isSaving}
                className={`form-input ${errors.notes ? 'error' : ''}`}
                placeholder="Notas adicionales sobre el proveedor..."
                rows={3}
                style={{
                  resize: 'vertical',
                  minHeight: '80px',
                  ...(errors.notes ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' } : {})
                }}
              />
              {errors.notes && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.notes}</p>
              )}
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
              disabled={isSaving || !formularioCompleto()}
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