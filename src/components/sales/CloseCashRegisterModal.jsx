import { useState } from 'react'
import { X, DollarSign, Clock, Calculator, FileText, TrendingUp, TrendingDown, Receipt } from 'lucide-react'

function CloseCashRegisterModal({ activeShift, onClose, onClose: onCloseShift, isClosing = false }) {
  const [formData, setFormData] = useState({
    closing_amount: '',
    notes: ''
  })
  const [error, setError] = useState('')

  // Calcular resumen del turno
  const openingAmount = activeShift?.opening_amount || 0
  const totalSales = activeShift?.total_sales || 0
  const expectedAmount = openingAmount + totalSales
  const closingAmount = parseFloat(formData.closing_amount) || 0
  const difference = closingAmount - expectedAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (formData.closing_amount === '') {
      setError('Debes especificar el dinero final en caja')
      return
    }

    const closing_amount = parseFloat(formData.closing_amount)
    if (isNaN(closing_amount) || closing_amount < 0) {
      setError('El dinero final debe ser un número válido mayor o igual a 0')
      return
    }

    try {
      await onCloseShift(activeShift.id, {
        closing_amount,
        notes: formData.notes.trim() || undefined
      })
    } catch (err) {
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Error al cerrar turno de caja'
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
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Calculator size={24} />
            </div>
            <div>
              <h3 className="modal-title">Cerrar Turno de Caja</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {activeShift?.name}
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

            {/* Resumen del Turno */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                📊 Resumen del Turno
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Inicio</div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      {activeShift?.opened_at ? new Date(activeShift.opened_at).toLocaleString('es-ES') : '-'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ventas</div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      {activeShift?.sales_count || 0} transacciones
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cálculos de Caja */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                💰 Cálculo de Caja
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dinero inicial:</span>
                  <span style={{ fontWeight: '500' }}>${openingAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total ventas:</span>
                  <span style={{ fontWeight: '500', color: 'var(--success)' }}>+${totalSales.toLocaleString()}</span>
                </div>
                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  <span>Dinero esperado:</span>
                  <span>${expectedAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dinero Final */}
            <div className="form-group">
              <label className="form-label">Dinero Final en Caja</label>
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
                  value={formData.closing_amount}
                  onChange={(e) => setFormData({ ...formData, closing_amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Cuenta todo el dinero físico que tienes en la caja
              </small>
            </div>

            {/* Diferencia (solo mostrar si hay datos) */}
            {formData.closing_amount !== '' && (
              <div style={{
                background: difference === 0 ? 'rgba(34, 197, 94, 0.15)' :
                          Math.abs(difference) <= 1000 ? 'rgba(255, 193, 7, 0.15)' :
                          'rgba(233, 69, 96, 0.15)',
                border: `1px solid ${difference === 0 ? 'var(--success)' :
                                   Math.abs(difference) <= 1000 ? 'var(--warning)' :
                                   'var(--accent)'}`,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {difference > 0 ?
                    <TrendingUp size={16} style={{ color: difference === 0 ? 'var(--success)' : 'var(--warning)' }} /> :
                    difference < 0 ?
                    <TrendingDown size={16} style={{ color: 'var(--accent)' }} /> :
                    <Calculator size={16} style={{ color: 'var(--success)' }} />
                  }
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: difference === 0 ? 'var(--success)' :
                           Math.abs(difference) <= 1000 ? 'var(--warning)' :
                           'var(--accent)'
                  }}>
                    {difference === 0 ? 'Caja Cuadrada ✓' :
                     difference > 0 ? `Sobrante: $${difference.toLocaleString()}` :
                     `Faltante: $${Math.abs(difference).toLocaleString()}`}
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  {difference === 0 ? 'El dinero en caja coincide perfectamente con las ventas' :
                   Math.abs(difference) <= 1000 ? 'Diferencia mínima - posible cambio pendiente o redondeo' :
                   'Diferencia significativa - verifica el conteo y las ventas'}
                </p>
              </div>
            )}

            {/* Notas de Cierre */}
            <div className="form-group">
              <label className="form-label">Notas de Cierre (Opcional)</label>
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
                  placeholder="Observaciones del cierre, incidencias, etc..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isClosing}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isClosing}>
              {isClosing ? (
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
                  Cerrando Turno...
                </>
              ) : (
                <>
                  <Calculator size={18} />
                  Cerrar Turno
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CloseCashRegisterModal