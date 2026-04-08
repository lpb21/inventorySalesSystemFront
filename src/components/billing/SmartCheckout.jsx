import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { billingAPI } from '../../api/config'
import './SmartCheckout.css'

export default function SmartCheckout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const planCode = searchParams.get('plan') || 'pro'
  const isRenewal = searchParams.get('renewal') === 'true' // Flag de renovación
  
  const authToken = location.state?.authToken // Token privado de la navegación, NULL si checkout anónimo
  const renewal_token = location.state?.renewal_token // Token de renovación (si aplica)
  const emailPassed = location.state?.email || location.state?.renewal_email // Email pasado desde Login/Renewal
  const namePassed = location.state?.name // Nombre pasado desde state
  const businessNamePassed = location.state?.company_name || location.state?.businessName // Nombre empresa
  
  const [state, setState] = useState('form') // form, loading, error
  const [formData, setFormData] = useState({
    email: emailPassed || '',
    name: namePassed || '',
    businessName: businessNamePassed || ''
  })
  const [error, setError] = useState(null)

  // Verificar que ePayco esté disponible (para futuro widget si se implementa)
  useEffect(() => {
    const checkEPayco = setInterval(() => {
      if (window.ePayco) {
        console.log('✅ ePayco está disponible')
        clearInterval(checkEPayco)
      }
    }, 100)

    return () => clearInterval(checkEPayco)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar campos requeridos
    if (!formData.email || !formData.name || !formData.businessName) {
      setError('Todos los campos son requeridos')
      return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido')
      return
    }

    setState('loading')
    setError(null)

    try {
      console.log('📤 Enviando solicitud al backend...')
      console.log('🔑 Modo:', authToken ? 'Autenticado' : isRenewal ? 'Renovación' : 'Anónimo')
      console.log('📧 Email:', formData.email)
      console.log('📝 Nombre:', formData.name)
      console.log('🏢 Empresa:', formData.businessName)
      console.log('🔄 Renovación:', isRenewal)

      // Llamar backend para obtener token/URL de checkout
      const requestData = {
        email: formData.email,
        plan_code: planCode,
        name: formData.name,
        businessName: formData.businessName,
        token: authToken // Pasar token si existe (null si anónimo/renovación)
      }

      // Si es renovación, incluir renewal_token en body
      if (isRenewal && renewal_token) {
        requestData.renewal_token = renewal_token
      }

      const response = await billingAPI.createSmartCheckoutSession(requestData)

      console.log('📥 Respuesta del backend:', response)

      if (!response?.data?.checkoutToken && !response?.checkoutToken) {
        throw new Error('No se obtuvo token de pago del servidor')
      }

      const checkoutData = response.checkoutToken ? response : response.data

      // Guardar en localStorage para referencia
      localStorage.setItem('currentCheckout', JSON.stringify({
        email: formData.email,
        planCode,
        reference: checkoutData.reference,
        isRenewal: isRenewal,
        timestamp: new Date().toISOString()
      }))

      // Redirigir a ePayco
      console.log('✅ Sesión de checkout creada. Redirigiendo a PSE...')
      console.log('🔗 Checkout URL:', checkoutData.checkoutToken)
      console.log('📍 Modo:', checkoutData.mode)
      console.log('🔄 Es Renovación:', checkoutData.is_renewal)
      
      // checkoutToken ya es la URL completa de PSE, redirigir directamente
      window.location.href = checkoutData.checkoutToken
    } catch (err) {
      console.error('❌ Error:', err)
      const errorMessage = err?.response?.data?.error?.message || err.message || 'Error creando sesión de pago'
      setError(errorMessage)
      setState('error')
    }
  }

  const handleRetry = () => {
    setState('form')
    setError(null)
  }

  return (
    <div className="smart-checkout">
      {/* Estado: Formulario */}
      {state === 'form' && (
        <div className="smart-checkout-card">
          <div className="checkout-header">
            <h1>Completar Pago</h1>
            <p className="plan-badge">Plan: <strong>{planCode.toUpperCase()}</strong></p>
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                disabled={state === 'loading'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Nombre Completo *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                required
                disabled={state === 'loading'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="businessName">Nombre de la Empresa *</label>
              <input
                id="businessName"
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Mi Empresa S.A.S"
                required
                disabled={state === 'loading'}
              />
            </div>

            <button
              type="submit"
              className="btn-pay"
              disabled={state === 'loading'}
            >
              {state === 'loading' ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Procesando...
                </>
              ) : (
                <>
                  💳 Continuar al Pago
                </>
              )}
            </button>

            <p className="checkout-info">
              Serás redirigido a PSE para completar tu pago de forma segura y verificada.
            </p>
          </form>
        </div>
      )}

      {/* Estado: Loading */}
      {state === 'loading' && (
        <div className="smart-checkout-card">
          <div className="loading-state">
            <Loader2 size={48} className="spinner" />
            <h2>Redirigiendo a PSE</h2>
            <p>Abriendo formulario de pago seguro...</p>
          </div>
        </div>
      )}

      {/* Estado: Error */}
      {state === 'error' && (
        <div className="smart-checkout-card">
          <div className="error-state">
            <AlertTriangle size={48} />
            <h2>⚠️ Error en el Pago</h2>
            <p>{error}</p>
            <button onClick={handleRetry} className="btn-retry">
              🔄 Intenta Nuevamente
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              ← Volver al Inicio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
