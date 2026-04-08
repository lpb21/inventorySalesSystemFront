import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useGlobalContext } from './context/GlobalContext'
import { authAPI, billingAPI, setToken, setUser, clearSession } from './api/config'

export default function Login({ error }) {
  const { login } = useGlobalContext()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [authModal, setAuthModal] = useState({ show: false, title: '', message: '', showPaymentLink: false, planCode: null, email: null })
  const [tempCredentials, setTempCredentials] = useState({ token: null, user: null })

  // Cerrar modal y limpiar sesión si el usuario no paga
  const handleCloseAuthModal = () => {
    setTempCredentials({ token: null, user: null })
    localStorage.removeItem('invah_token')
    localStorage.removeItem('invah_user')
    setAuthModal({ show: false, title: '', message: '', showPaymentLink: false, planCode: null, email: null })
  }

  // Smart Checkout para usuarios con suscripción vencida
  // Puede ser autenticado (con token) o anónimo (solo email)
  const handleSmartCheckout = (planCode, email) => {
    console.log('🔍 handleSmartCheckout called')
    console.log('📍 tempCredentials:', tempCredentials)
    console.log('📍 planCode:', planCode)
    console.log('📍 email:', email)
    
    if (!email) {
      console.error('❌ Email no disponible')
      return
    }

    console.log('✅ Navegando a RenewalRequired page')
    
    // Redirigir a página de renovación (no directamente a checkout)
    // El usuario ingresará su email para obtener renewal_token
    navigate(`/billing/renewal-required?email=${encodeURIComponent(email)}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setLoading(true)

    try {
      const response = await authAPI.login({
        email: username,
        password: password
      })
      
      // apiRequest() ya normaliza la respuesta, así que response es directamente { token, user }
      const token = response?.token
      const user  = response?.user
      
      if (!token || !user) {
        setLocalError('Respuesta del servidor inesperada')
        return
      }

      // Guardar credenciales temporalmente (no en GlobalContext aún)
      setTempCredentials({ token, user })

      // Validar estado de suscripción contra el servicio dedicado
      try {
        // Guardamos token temporalmente en localStorage para que billingAPI pueda hacer requests
        localStorage.setItem('invah_token', token)
        
        const subsResponse = await billingAPI.getCurrentSubscription()
        const subsData = subsResponse?.data || subsResponse || {}
        const canAccess = subsData?.can_access_system
        const overallStatus = subsData?.subscription?.overall_status
        const planCode = subsData?.plan_info?.code || subsData?.tenant?.current_plan || 'tu plan'
        const timeInfo = subsData?.time_info || {}

        // Validación defensiva: bloquear si hay cualquier indicador de suscripción inválida
        // - can_access_system explícitamente false
        // - is_expired en true
        // - days_remaining negativo (expirado)
        // - needs_attention en true
        const isExpired = timeInfo?.is_expired === true
        const daysRemaining = timeInfo?.days_remaining ?? Infinity
        const needsAttention = subsData?.needs_attention === true

        if (canAccess === false || isExpired || daysRemaining < 0 || needsAttention) {
          let subsMessage = `Tu suscripción al plan ${String(planCode).toUpperCase()} no está activa. Por favor renueva tu suscripción.`

          if (overallStatus === 'grace_period') {
            subsMessage = `Tu pago del plan ${String(planCode).toUpperCase()} está pendiente. Tienes ${timeInfo.days_in_grace || 'varios'} día(s) de gracia hasta el ${timeInfo.grace_until_formatted || 'próximo'}.`
          } else if (overallStatus === 'expired' || isExpired || daysRemaining < 0) {
            subsMessage = `Tu suscripción al plan ${String(planCode).toUpperCase()} ha vencido el ${timeInfo.current_period_end_formatted || 'próximamente'}. Por favor renueva tu suscripción.`
          } else if (overallStatus === 'canceled') {
            subsMessage = `Tu suscripción al plan ${String(planCode).toUpperCase()} ha sido cancelada. Por favor contacta a soporte o renueva tu plan.`
          }

          // Mostrar modal bloqueado sin guardar en GlobalContext
          // El token sigue en localStorage para que checkout funcione
          setAuthModal({
            show: true,
            title: 'Acceso bloqueado por suscripción',
            message: subsMessage,
            showPaymentLink: true,
            planCode: String(planCode).toLowerCase(),
          })

          return
        }

        // Suscripción válida - proceder con login
        setToken(token)
        setUser(user)
        login(user, token)
      } catch (subsError) {
        // Si el servicio de suscripción responde 401, también bloqueamos acceso
        const status = subsError?.response?.status
        const backendError = subsError?.response?.data?.error
        const backendMessage = backendError?.message || subsError?.response?.data?.message

        if (status === 401 && backendMessage) {
          // No limpiar sesión - mantener token disponible para checkout
          setAuthModal({
            show: true,
            title: 'Acceso bloqueado por suscripción',
            message: backendMessage,
            showPaymentLink: backendError?.code === 'AUTHENTICATION_ERROR',
            planCode: null,
          })
          return
        }
        // En otros errores de red, dejamos continuar el login normal
      }
    } catch (err) {
      const status = err?.response?.status
      const backendError = err?.response?.data?.error
      const backendMessage = backendError?.message || err?.response?.data?.message
      const message = backendMessage || err?.message || 'Usuario o contraseña incorrectos'

      // Detectar si el error es relacionado a suscripción por palabras clave en el mensaje
      const isSubscriptionError = /suscripción|plan|vencida|cancelada|expirada|gracia|renovar/i.test(message)

      // Si es 401 por credenciales inválidas (sin mención de suscripción), mostrar error simple
      if (status === 401 && !isSubscriptionError) {
        setLocalError(message)
      }
      // Si es 401 y el mensaje indica problema de suscripción, mostrar modal de pago
      else if (status === 401 && isSubscriptionError) {
        // Guardar el email del usuario para checkout anónimo
        setTempCredentials({ token: null, user: { email: username } })
        
        setAuthModal({
          show: true,
          title: 'Acceso bloqueado por suscripción',
          message,
          showPaymentLink: true,
          planCode: null,
          email: username // Guardar el email para checkout anónimo
        })
      } else {
        setLocalError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg">
        <div className="login-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">Ih</div>
          </div>
          <h1 className="login-title">Invah</h1>
          <p className="login-subtitle">Inventories Network Visualization Analytics Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input
                type="text"
                className="form-input with-icon"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input with-icon"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {(localError || error) && (
            <div className="login-error">
              {localError || error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>

      {authModal.show && (
        <div
          className="alert-modal-overlay"
          onClick={() => handleCloseAuthModal()}
        >
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alert-modal-header">
              <div className="alert-icon"><AlertTriangle size={28} /></div>
              <h3 className="alert-modal-title">{authModal.title}</h3>
            </div>
            <div className="alert-modal-body">
              <p className="alert-message">{authModal.message}</p>
            </div>
            <div className="alert-modal-footer">
              {authModal.showPaymentLink && (
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => handleSmartCheckout(authModal.planCode || 'pro', authModal.email)}
                >
                  💳 Ir a pagar suscripción
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => handleCloseAuthModal()}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
