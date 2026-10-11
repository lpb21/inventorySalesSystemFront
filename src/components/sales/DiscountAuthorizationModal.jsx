import { useState } from 'react'
import { X, ShieldCheck, AlertTriangle } from 'lucide-react'
import { salesAPI } from '../../api/config'
import Modal from '../shared/Modal'
import {
  buildDiscountAuthorizationItems,
  getLineGross,
  getLineTotal,
  isBelowCost,
  normalizeDiscountPercent
} from '../../utils/discounts'

// El cajero no puede dar descuentos: un supervisor, administrador o propietario
// los aprueba aquí con su correo y contraseña, sin cerrar la sesión del cajero.
// onAuthorized recibe el token que acompaña a la venta.
function DiscountAuthorizationModal({ cart, onAuthorized, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const discountedItems = cart.filter(item => normalizeDiscountPercent(item.discount_percent) > 0)
  const anyBelowCost = discountedItems.some(isBelowCost)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const result = await salesAPI.authorizeDiscount({
        email: email.trim(),
        password,
        items: buildDiscountAuthorizationItems(cart),
      })
      onAuthorized(result.token, result.authorized_by)
    } catch (err) {
      const apiError = err?.response?.data?.error
      const detail = Array.isArray(apiError?.details) && apiError.details.length ? apiError.details.join(', ') : null
      setError(detail || apiError?.message || 'No se pudo autorizar el descuento')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Autorizar descuento" maxWidth="520px" dismissible={!loading}>
      <div className="modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(255, 193, 7, 0.15)', color: 'var(--warning)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={24} />
          </div>
          <h3 className="modal-title">Autorizar descuento</h3>
        </div>
        <button type="button" className="modal-close" onClick={onClose} disabled={loading} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Un supervisor, administrador o propietario debe aprobar estos descuentos.
          </p>

          <ul className="discount-auth-list">
            {discountedItems.map(item => (
              <li key={item.id} className="discount-auth-item">
                <div className="discount-auth-name">
                  {item.name}
                  <span className="discount-auth-percent">-{normalizeDiscountPercent(item.discount_percent)}%</span>
                </div>
                <div className="discount-auth-amounts">
                  <span className="cart-item-original">${getLineGross(item).toLocaleString()}</span>
                  <strong>${getLineTotal(item).toLocaleString()}</strong>
                </div>
                {isBelowCost(item) && (
                  <div className="discount-below-cost" role="alert">
                    <AlertTriangle size={16} />
                    Con este descuento se vende por debajo del costo
                  </div>
                )}
              </li>
            ))}
          </ul>

          {error && (
            <div className="discount-auth-error" role="alert">{error}</div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="discount-auth-email">Correo de quien autoriza</label>
            <input
              id="discount-auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="discount-auth-password">Contraseña</label>
            <input
              id="discount-auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !email.trim() || !password}>
            {loading ? 'Verificando...' : anyBelowCost ? 'Autorizar de todos modos' : 'Autorizar y cobrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default DiscountAuthorizationModal
