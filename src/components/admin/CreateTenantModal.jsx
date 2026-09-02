import { useState } from 'react'
import { X, Save, Building2, User, Mail, Lock, Calendar } from 'lucide-react'
import { useAdminTenantMutations } from '../../hooks/queries/useAdminTenants'

/**
 * CreateTenantModal — Alta manual de un cliente completo (superadmin).
 * Crea negocio + usuario owner + suscripción con el período elegido.
 */
function CreateTenantModal({ onClose, addToast }) {
  const { create } = useAdminTenantMutations()

  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    period: 'monthly',
  })
  const [saving, setSaving] = useState(false)

  // Genera un slug alfanumérico a partir del nombre del negocio
  // (sin espacios, tildes ni caracteres especiales — cumple la validación del back)
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[^a-z0-9]/g, '')                         // solo letras y números
  }

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const periods = [
    { value: 'trial', label: 'Prueba (7 días)' },
    { value: 'monthly', label: 'Mensual (30 días)' },
    { value: 'quarterly', label: 'Trimestral (90 días)' },
    { value: 'biannual', label: 'Semestral (180 días)' },
    { value: 'yearly', label: 'Anual (365 días)' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.business_name.trim()) return addToast('Ingrese el nombre del negocio', 'error')
    if (!form.owner_name.trim()) return addToast('Ingrese el nombre del propietario', 'error')
    if (!form.owner_email.trim()) return addToast('Ingrese el correo del propietario', 'error')
    if (form.owner_password.length < 6) return addToast('La contraseña debe tener al menos 6 caracteres', 'error')

    const slug = generateSlug(form.business_name)
    if (!slug) return addToast('El nombre del negocio debe tener letras o números', 'error')

    setSaving(true)
    try {
      await create.mutateAsync({
        business_name: form.business_name.trim(),
        slug,
        owner_name: form.owner_name.trim(),
        owner_email: form.owner_email.trim(),
        owner_password: form.owner_password,
        period: form.period,
      })
      addToast('Cliente creado correctamente', 'success')
      onClose()
    } catch (error) {
      addToast('Error al crear el cliente: ' + (error.message || ''), 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputWrap = { position: 'relative' }
  const iconStyle = {
    position: 'absolute', left: '12px', top: '50%',
    transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none'
  }
  const inputStyle = { paddingLeft: '38px' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="modal-title">Nuevo Cliente</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Crea el negocio, su propietario y la suscripción
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Datos del negocio */}
            <div className="form-group">
              <label className="form-label">Nombre del negocio *</label>
              <div style={inputWrap}>
                <span style={iconStyle}><Building2 size={16} /></span>
                <input
                  type="text" className="form-input" style={inputStyle}
                  value={form.business_name}
                  onChange={(e) => update('business_name', e.target.value)}
                  placeholder="Ej: Salsamentaría El Buen Sabor"
                  autoFocus
                />
              </div>
              {form.business_name && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Identificador: <strong>{generateSlug(form.business_name) || '—'}</strong>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 16px' }} />

            {/* Datos del propietario */}
            <div className="form-group">
              <label className="form-label">Nombre del propietario *</label>
              <div style={inputWrap}>
                <span style={iconStyle}><User size={16} /></span>
                <input
                  type="text" className="form-input" style={inputStyle}
                  value={form.owner_name}
                  onChange={(e) => update('owner_name', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo del propietario *</label>
              <div style={inputWrap}>
                <span style={iconStyle}><Mail size={16} /></span>
                <input
                  type="email" className="form-input" style={inputStyle}
                  value={form.owner_email}
                  onChange={(e) => update('owner_email', e.target.value)}
                  placeholder="correo@negocio.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña inicial *</label>
              <div style={inputWrap}>
                <span style={iconStyle}><Lock size={16} /></span>
                <input
                  type="text" className="form-input" style={inputStyle}
                  value={form.owner_password}
                  onChange={(e) => update('owner_password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                El propietario podrá cambiarla después de ingresar.
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 16px' }} />

            {/* Período */}
            <div className="form-group">
              <label className="form-label">Período de suscripción *</label>
              <div style={inputWrap}>
                <span style={iconStyle}><Calendar size={16} /></span>
                <select
                  className="form-select" style={{ ...inputStyle, minWidth: 0, width: '100%' }}
                  value={form.period}
                  onChange={(e) => update('period', e.target.value)}
                >
                  {periods.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : (<><Save size={18} /> Crear Cliente</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTenantModal