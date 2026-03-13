import { useState } from 'react'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { useGlobalContext } from './context/GlobalContext'
import { authAPI, setToken, setUser } from './api/config'

export default function Login({ error }) {
  const { login } = useGlobalContext()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setLoading(true)

    try {
      const response = await authAPI.login({
        email: username,
        password: password
      })
      
      const token = response.data?.token || response.token
      const user  = response.data?.user  || response.user
      
      if (!token || !user) {
        setLocalError('Respuesta del servidor inesperada')
        setLoading(false)
        return
      }
      
      setToken(token)
      setUser(user)
      
      login(user, token)
    } catch (err) {
      setLocalError(err.message || 'Usuario o contraseña incorrectos')
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
    </div>
  )
}
