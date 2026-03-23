import { useState } from 'react'
import { X, DollarSign, Clock, User, FileText } from 'lucide-react'

function OpenCashRegisterModal({ userName, onOpen, onClose, isOpening = false }) {
  const [formData, setFormData] = useState({
    name: `Turno ${userName || 'Usuario'} - ${new Date().toLocaleDateString('es-ES')}`,
    opening_amount: '',
    notes: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.name.trim()) {
      setError('El nombre del turno es requerido')
      return
    }

    if (formData.opening_amount === '') {
      setError('Debes especificar el dinero inicial (puede ser 0)')
      return
    }

    const opening_amount = parseFloat(formData.opening_amount)
    if (isNaN(opening_amount) || opening_amount < 0) {
      setError('El dinero inicial debe ser un número válido mayor o igual a 0')
      return
    }

    try {
      await onOpen({
        name: formData.name.trim(),
        opening_amount: opening_amount,
        notes: formData.notes.trim() || undefined
      })
    } catch (err) {
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Error al abrir turno de caja'
      setError(errorMessage)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <h3 className="modal-title">Abrir Turno de Caja</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Administra tu caja y registra ventas
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(233, 69, 96, 0.15)',
                border: '1px solid var(--accent)',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                color: 'var(--accent)'
              }}>
                {error}
              </div>
            )}

            {/* Información del Usuario */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Operador de Caja
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {userName || 'Usuario Actual'}
              </p>
            </div>

            {/* Nombre del Turno */}
            <div className="form-group">
              <label className="form-label">Nombre del Turno</label>
              <div style={{ position: 'relative' }}>
                <Clock
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)'
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Turno Mañana - 20 Marzo"
                  required
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Identifica tu turno de trabajo
              </small>
            </div>

            {/* Dinero Inicial */}
            <div className="form-group">
              <label className="form-label">Dinero Inicial de Caja</label>
              <div style={{ position: 'relative' }}>
                <DollarSign
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)'
                  }}
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  value={formData.opening_amount}
                  onChange={(e) => setFormData({ ...formData, opening_amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Dinero disponible para dar cambio. Puede ser $0 si no manejas efectivo.
              </small>
            </div>

            {/* Notas Adicionales */}
            <div className="form-group">
              <label className="form-label">Notas (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <FileText
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '12px',
                    color: 'var(--text-secondary)'
                  }}
                />
                <textarea
                  className="form-input"
                  style={{ paddingLeft: '40px', minHeight: '80px', resize: 'vertical' }}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observaciones del turno..."
                />
              </div>
            </div>

            {/* Información Importante */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px 16px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#3b82f6' }}>
                ℹ️ Información Importante
              </h4>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Necesitas abrir un turno para poder realizar ventas</li>
                <li>El dinero inicial es para referencia y control de caja</li>
                <li>Puedes consultar las ventas realizadas durante tu turno</li>
                <li>Al finalizar deberás cerrar el turno con el dinero final</li>
              </ul>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isOpening}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isOpening}>
              {isOpening ? (
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
                  Abriendo Turno...
                </>
              ) : (
                <>
                  <Clock size={18} />
                  Abrir Turno
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OpenCashRegisterModal