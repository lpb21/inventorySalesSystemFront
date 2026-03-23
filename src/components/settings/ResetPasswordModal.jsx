import { useState } from 'react'
import { X, Lock, Eye, EyeOff, RefreshCw, AlertTriangle, Copy, Check } from 'lucide-react'
import { authAPI } from '../../api/config'

function ResetPasswordModal({ user, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateRandomPassword = () => {
    const length = 8
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setNewPassword(password)
    setShowPassword(true)
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validación frontend
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(user.id, {
        new_password: newPassword
      })

      setResetComplete(true)

      if (onSuccess) {
        onSuccess(`Contraseña de ${user.name} reseteada correctamente`)
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Error al resetear la contraseña'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (resetComplete) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
                <Check size={24} />
              </div>
              <h3 className="modal-title">Contraseña Reseteada</h3>
            </div>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div style={{
              padding: '16px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid var(--success)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--success)' }}>
                La contraseña de <strong>{user.name}</strong> ({user.email}) ha sido actualizada correctamente.
              </p>
            </div>

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Contraseña Temporal
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newPassword}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="btn btn-secondary"
                  style={{ minWidth: '100px' }}
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 193, 7, 0.15)',
              border: '1px solid var(--warning)',
              borderRadius: '8px',
              padding: '12px 16px'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--warning)' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                <strong>Importante:</strong> Comunica esta contraseña al usuario de forma segura (teléfono, WhatsApp, etc.).
                El usuario deberá cambiarla al iniciar sesión.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
              <RefreshCw size={24} />
            </div>
            <h3 className="modal-title">Resetear Contraseña</h3>
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
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Usuario seleccionado
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>
                <br />
                {user.email}
              </p>
            </div>

            {/* Nueva Contraseña Temporal */}
            <div className="form-group">
              <label className="form-label">Nueva Contraseña Temporal</label>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Lock
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
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ej: temporal123"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '12px' }}
              >
                <RefreshCw size={16} />
                Generar Contraseña Segura
              </button>
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>
                Mínimo 6 caracteres. El usuario deberá cambiarla al iniciar sesión.
              </small>
            </div>

            {/* Advertencia */}
            <div style={{
              background: 'rgba(255, 193, 7, 0.15)',
              border: '1px solid var(--warning)',
              borderRadius: '8px',
              padding: '12px 16px'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--warning)' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                <strong>Advertencia:</strong> Esta acción cambiará la contraseña del usuario inmediatamente.
                Asegúrate de comunicarle la nueva contraseña de forma segura.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
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
                  Reseteando...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Confirmar Reset
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordModal
