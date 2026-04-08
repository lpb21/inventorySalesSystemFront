import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { billingAPI } from '../../api/config'
import './RenewalRequired.css'

export default function RenewalRequired() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const emailParam = searchParams.get('email') || '' // Email pasado desde Login
  
  const [email, setEmail] = useState(emailParam)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar email
    if (!email) {
      setError('Email es requerido')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Email inválido')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('📤 Iniciando sesión de renovación...')
      console.log('📧 Email:', email)

      // POST /renewal/session para obtener renewal_token
      const response = await billingAPI.createRenewalSession({
        email
      })

      console.log('📥 Respuesta del backend:', response)

      if (!response?.renewal_token && !response?.data?.renewal_token) {
        throw new Error('No se obtuvo token de renovación del servidor')
      }

      const renewalData = response.renewal_token ? response : response.data

      console.log('✅ Token de renovación obtenido, redirigiendo a SmartCheckout...')

      // Guardar renewal_token en sessionStorage (temporal, solo para esta transacción)
      sessionStorage.setItem('renewal_token', renewalData.renewal_token)
      sessionStorage.setItem('renewal_email', email)
      sessionStorage.setItem('renewal_company', renewalData.company_name || '')

      // Redirigir a SmartCheckout con estado de renovación
      navigate('/billing/smart-checkout?plan=pro&renewal=true', {
        state: {
          renewal_token: renewalData.renewal_token,
          email: email,
          renewal_email: email,
          company_name: renewalData.company_name,
          businessName: renewalData.company_name,
          isRenewal: true
        }
      })
    } catch (err) {
      console.error('❌ Error:', err)
      const errorMessage = err?.response?.data?.error?.message || err.message || 'Error en renovación'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="renewal-required">
      <div className="renewal-container">
        <div className="renewal-card">
          <div className="renewal-header">
            <div className="renewal-icon">
              <AlertTriangle size={48} />
            </div>
            <h1>🔄 Renovar Tu Suscripción</h1>
            <p className="subtitle">Tu suscripción ha vencido o sido cancelada</p>
          </div>

          <div className="renewal-body">
            <p className="renewal-message">
              Para volver a acceder a tu sistema, necesitas renovar tu suscripción. 
              Ingresa el email asociado a tu cuenta para continuar.
            </p>

            {error && (
              <div className="error-message">
                <AlertTriangle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="renewal-form">
              <div className="form-group">
                <label htmlFor="email">Email de la Empresa *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn-renew"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    Verificando...
                  </>
                ) : (
                  <>
                    🔄 Renovar Suscripción
                  </>
                )}
              </button>

              <p className="renewal-info">
                Se te enviará al formulario de pago seguro para completar la renovación.
              </p>
            </form>
          </div>

          <div className="renewal-footer">
            <p className="support-text">
              ¿Problemas? <a href="mailto:soporte@invleo.com">Contacta a soporte</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
