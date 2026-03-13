import { useState, useEffect } from 'react'
import { X, Save, User, Phone, Mail, MapPin, DollarSign } from 'lucide-react'

function CustomerModal({ customer, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: ''
  })

  const [phoneError, setPhoneError] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [addressError, setAddressError] = useState('')
  const [creditLimitError, setCreditLimitError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        credit_limit: customer.credit_limit || ''
      })
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        credit_limit: ''
      })
    }
    setPhoneError('')
    setNameError('')
    setEmailError('')
    setAddressError('')
    setCreditLimitError('')
  }, [customer])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar todos los campos
    const nameValidation = validarNombre(formData.name)
    const phoneValidation = formData.phone.trim() ? validarTelefono(formData.phone) : { valid: true, message: '' }
    const emailValidation = validarEmail(formData.email)
    const addressValidation = validarDireccion(formData.address)
    const creditLimitValidation = validarLimiteCredito(formData.credit_limit)
    
    // Establecer errores
    setNameError(nameValidation.valid ? '' : nameValidation.message)
    setPhoneError(phoneValidation.valid ? '' : phoneValidation.message)
    setEmailError(emailValidation.valid ? '' : emailValidation.message)
    setAddressError(addressValidation.valid ? '' : addressValidation.message)
    setCreditLimitError(creditLimitValidation.valid ? '' : creditLimitValidation.message)
    
    // Si hay errores, no enviar
    if (!nameValidation.valid || !phoneValidation.valid || !emailValidation.valid || 
        !addressValidation.valid || !creditLimitValidation.valid) {
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        ...formData,
        credit_limit: parseFloat(formData.credit_limit) || 0
      })
    } catch (error) {
      console.error('Error saving customer:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const validarTelefono = (numero) => {
    const soloNumeros = numero.toString().replace(/\D/g, '');
    if (soloNumeros.length === 0) {
      return { valid: true, message: '' }
    }
    if (soloNumeros.length >= 7 && soloNumeros.length <= 10) {
      return { valid: true, message: '' }
    }
    return { valid: false, message: 'El teléfono debe tener entre 7 y 10 dígitos' }
  }

  const validarNombre = (nombre) => {
    const trimmedName = nombre.trim()
    if (!trimmedName) {
      return { valid: false, message: 'El nombre es obligatorio' }
    }
    if (/\d/.test(trimmedName)) {
      return { valid: false, message: 'El nombre no puede contener números' }
    }
    if (trimmedName.length < 2) {
      return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' }
    }
    return { valid: true, message: '' }
  }

  const validarEmail = (email) => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      return { valid: true, message: '' } // Email es opcional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, message: 'Ingrese un correo electrónico válido' }
    }
    return { valid: true, message: '' }
  }

  const validarDireccion = (direccion) => {
    const trimmedAddress = direccion.trim()
    if (!trimmedAddress) {
      return { valid: false, message: 'La dirección es obligatoria' }
    }
    if (trimmedAddress.length < 5) {
      return { valid: false, message: 'La dirección debe tener al menos 5 caracteres' }
    }
    return { valid: true, message: '' }
  }

  const validarLimiteCredito = (limite) => {
    const trimmedLimit = limite.toString().trim()
    if (!trimmedLimit) {
      return { valid: false, message: 'El límite de crédito es obligatorio' }
    }
    const numericLimit = parseFloat(trimmedLimit)
    if (isNaN(numericLimit) || numericLimit < 0) {
      return { valid: false, message: 'Ingrese un límite de crédito válido (mayor o igual a 0)' }
    }
    return { valid: true, message: '' }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <User size={24} />
            </div>
            <div>
              <h3 className="modal-title">{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {customer ? 'Modifique los datos del cliente' : 'Ingrese los datos del nuevo cliente'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre del Cliente *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\d/g, '')
                    setFormData({...formData, name: valor})
                    if (nameError) {
                      const validation = validarNombre(valor)
                      if (validation.valid) setNameError('')
                    }
                  }}
                  onBlur={(e) => {
                    const validation = validarNombre(e.target.value)
                    setNameError(validation.valid ? '' : validation.message)
                  }}
                  placeholder="Ej: Juan Pérez"
                  style={{ 
                    paddingLeft: '40px',
                    ...(nameError && { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' })
                  }}
                  autoFocus
                  required
                />
              </div>
              {nameError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                  {nameError}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="tel"
                  className={`form-input ${phoneError ? 'error' : ''}`}
                  value={formData.phone}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '')
                    setFormData({...formData, phone: valor})
                    if (phoneError) {
                      const validation = validarTelefono(valor)
                      if (validation.valid) setPhoneError('')
                    }
                  }}
                  onBlur={(e) => {
                    const validation = validarTelefono(e.target.value)
                    setPhoneError(validation.valid ? '' : validation.message)
                  }}
                  placeholder="Ej: 3001234567"
                  style={{ 
                    paddingLeft: '40px',
                    ...(phoneError && { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' })
                  }}
                />
              </div>
              {phoneError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                  {phoneError}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value})
                    if (emailError) {
                      const validation = validarEmail(e.target.value)
                      if (validation.valid) {
                        setEmailError('')
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const validation = validarEmail(e.target.value)
                    setEmailError(validation.valid ? '' : validation.message)
                  }}
                  placeholder="Ej: cliente@email.com"
                  style={{ 
                    paddingLeft: '40px',
                    ...(emailError && { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' })
                  }}
                />
              </div>
              {emailError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                  {emailError}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Dirección *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({...formData, address: e.target.value})
                    if (addressError) {
                      const validation = validarDireccion(e.target.value)
                      if (validation.valid) {
                        setAddressError('')
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const validation = validarDireccion(e.target.value)
                    setAddressError(validation.valid ? '' : validation.message)
                  }}
                  placeholder="Ej: Calle 123 # 45-67"
                  style={{ 
                    paddingLeft: '40px',
                    ...(addressError && { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' })
                  }}
                  required
                />
              </div>
              {addressError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                  {addressError}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Límite de Crédito *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="number"
                  className="form-input"
                  value={formData.credit_limit}
                  onChange={(e) => {
                    setFormData({...formData, credit_limit: e.target.value})
                    if (creditLimitError) {
                      const validation = validarLimiteCredito(e.target.value)
                      if (validation.valid) {
                        setCreditLimitError('')
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const validation = validarLimiteCredito(e.target.value)
                    setCreditLimitError(validation.valid ? '' : validation.message)
                  }}
                  placeholder="Ej: 500000"
                  style={{ 
                    paddingLeft: '40px',
                    ...(creditLimitError && { borderColor: 'var(--danger)', boxShadow: '0 0 0 1px var(--danger)' })
                  }}
                  min="0"
                  step="1000"
                  required
                />
              </div>
              {creditLimitError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                  {creditLimitError}
                </p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Monto máximo que el cliente puede adeudar
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span style={{ 
                    width: '18px', 
                    height: '18px', 
                    border: '2px solid rgba(255,255,255,0.3)', 
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                    marginRight: '8px'
                  }} />
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

export default CustomerModal
