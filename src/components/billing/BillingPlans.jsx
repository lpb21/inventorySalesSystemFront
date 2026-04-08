import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { billingAPI } from '../../api/config'
import './BillingPlans.css'

export default function BillingPlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        const response = await billingAPI.getPlans()
        const plansList = response?.plans || []
        setPlans(plansList)
      } catch (err) {
        console.error('Error al cargar planes:', err)
        setError('Error al cargar los planes disponibles')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const handleSelectPlan = (planCode) => {
    navigate(`/billing/smart-checkout?plan=${planCode}`)
  }

  if (loading) {
    return (
      <div className="billing-plans-loading">
        <Loader2 size={48} className="spinner" />
        <p>Cargando planes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="billing-plans-error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-retry"
        >
          Intenta Nuevamente
        </button>
      </div>
    )
  }

  return (
    <div className="billing-plans">
      <div className="billing-plans-container">
        <div className="billing-plans-header">
          <h1>Nuestros Planes</h1>
          <p>Elige el plan que mejor se adapte a tu negocio</p>
        </div>

        {plans.length === 0 ? (
          <div className="no-plans">
            <p>No hay planes disponibles en este momento.</p>
            <p>Por favor intenta más tarde.</p>
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => {
              const amountInPesos = plan.amountInCents / 100
              const isPopular = plan.code === 'pro'

              return (
                <div
                  key={plan.code}
                  className={`plan-card ${isPopular ? 'popular' : ''}`}
                >
                  {isPopular && <div className="popular-badge">Recomendado</div>}

                  <div className="plan-content">
                    <h3 className="plan-name">{plan.displayName}</h3>
                    <p className="plan-description">{plan.description || 'Plan de suscripción'}</p>

                    <div className="plan-price">
                      <span className="amount">
                        ${amountInPesos.toLocaleString('es-CO')}
                      </span>
                      <span className="currency">/mes COP</span>
                    </div>

                    {plan.features && plan.features.length > 0 ? (
                      <ul className="plan-features">
                        {plan.features.map((feature, idx) => (
                          <li key={idx}>
                            <Check size={18} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="plan-features">
                        <li>
                          <Check size={18} />
                          <span>Hasta {plan.maxProducts || 0} productos</span>
                        </li>
                        <li>
                          <Check size={18} />
                          <span>Hasta {plan.maxUsers || 0} usuarios</span>
                        </li>
                        <li>
                          <Check size={18} />
                          <span>Soporte por {plan.support || 'email'}</span>
                        </li>
                      </ul>
                    )}
                  </div>

                  <button
                    className={`btn-select-plan ${isPopular ? 'primary' : 'secondary'}`}
                    onClick={() => handleSelectPlan(plan.code)}
                  >
                    💳 Contratar {plan.displayName}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
