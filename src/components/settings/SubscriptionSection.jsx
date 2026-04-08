import { ArrowUpCircle, CreditCard, AlertCircle, Clock } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useBilling } from '../../hooks/useBilling'
import { useSubscription } from '../../hooks/useSubscription'

function formatPrice(amountInCents, currency = 'COP') {
  if (amountInCents === 0) return 'Gratis'
  const value = (amountInCents || 0) / 100
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function SubscriptionSection() {
  const { currentUser } = useGlobalContext()
  const { subscription, plans, loading, error } = useSubscription()
  const { handleCheckout, loading: checkoutLoading } = useBilling()

  // Extraer datos de la nueva estructura
  const subsData = subscription || {}
  const currentSub = subsData.subscription
  const planInfo = subsData.plan_info
  const timeInfo = subsData.time_info
  const hasActiveSubscription = subsData.has_active_subscription
  const needsAttention = subsData.needs_attention
  const canAccess = subsData.can_access_system

  const currentPlanCode = planInfo?.code || subsData.tenant?.current_plan || currentUser?.tenant?.plan || null

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={20} />
          <h3 className="card-title" style={{ marginBottom: 0 }}>Planes y Suscripción</h3>
        </div>
        {currentPlanCode && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Plan actual: <strong style={{ textTransform: 'capitalize' }}>{currentPlanCode}</strong>
          </div>
        )}
      </div>

      {loading && (
        <div className="empty-state" style={{ padding: '32px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32 }} />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando información de planes...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No se pudo cargar la información de suscripción.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Estado actual de la suscripción */}
          {hasActiveSubscription && planInfo && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0,217,165,0.08)', borderRadius: '8px', border: '1px solid rgba(0,217,165,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Clock size={18} style={{ marginTop: '2px', color: '#00d9a5' }} />
                <div style={{ flex: 1, fontSize: '13px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    Suscripción {planInfo.display_name || planInfo.code}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Precio: <strong>{planInfo.amount_formatted || formatPrice(planInfo.amount_in_cents)}</strong> por {planInfo.cycle_days || 30} días
                  </div>
                  {timeInfo?.days_remaining !== undefined && (
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Renovación: <strong>{timeInfo.days_remaining} día(s)</strong> • {timeInfo.current_period_end_formatted}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alerta si necesita atención */}
          {needsAttention && !hasActiveSubscription && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(244,63,94,0.08)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertCircle size={18} style={{ marginTop: '2px', color: '#f43f5e' }} />
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Tu suscripción requiere atención. Por favor renuévala para acceder al sistema.
                </div>
              </div>
            </div>
          )}

          {/* Planes disponibles */}
          {Array.isArray(plans) && plans.length > 0 && (
            <div className="grid-3" style={{ marginTop: '12px', gap: '16px' }}>
              {plans.map((plan) => {
                const isCurrent = plan.code === currentPlanCode

                return (
                  <div
                    key={plan.code || plan.id}
                    className="card"
                    style={{
                      borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                      background: isCurrent ? 'rgba(233,69,96,0.04)' : 'var(--surface)',
                    }}
                  >
                    <div className="card-header" style={{ marginBottom: '8px' }}>
                      <h4 className="card-title" style={{ marginBottom: 0 }}>{plan.display_name || plan.name || plan.code}</h4>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 600 }}>
                        {formatPrice(plan.amountInCents ?? plan.amount_in_cents ?? plan.priceInCents ?? 0)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        por {plan.cycle_days || 30} días
                      </div>
                    </div>
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {plan.features.map((feature, index) => (
                          <li key={index} style={{ marginBottom: 4 }}>
                            • {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '4px', opacity: isCurrent ? 0.8 : 1 }}
                      disabled={isCurrent || checkoutLoading}
                      onClick={() => handleCheckout(plan.code)}
                    >
                      {isCurrent ? (
                        'Plan actual'
                      ) : (
                        <>
                          <ArrowUpCircle size={16} style={{ marginRight: 6 }} />
                          {checkoutLoading ? 'Redirigiendo...' : 'Mejorar plan'}
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!Array.isArray(plans) || plans.length === 0 && (
            <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No hay planes disponibles para mostrar.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
