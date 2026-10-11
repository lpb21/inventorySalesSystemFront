import { CreditCard, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSubscription } from '../../hooks/useSubscription'
import { buildSupportWhatsappUrl, buildSubscriptionRenewalMessage } from '../../utils/support'

const EXPIRING_SOON_DAYS = 7

const STATUS_LABELS = {
  active: 'Activa',
  trial: 'Periodo de prueba',
  grace_period: 'En periodo de gracia',
  past_due: 'Pago pendiente',
  pending: 'Pago pendiente',
  expired: 'Vencida',
  cancelled: 'Cancelada',
  suspended: 'Suspendida',
}

const formatDate = (value) => (
  value ? new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : null
)

/**
 * Estado y vigencia de la suscripción del negocio. Se cobra por tiempo de uso
 * (todos los negocios tienen todas las funciones) y la renovación la activa
 * soporte, así que aquí no hay planes ni precios: solo hasta cuándo está
 * vigente y cómo renovar.
 */
export default function SubscriptionSection() {
  const { currentUser } = useGlobalContext()
  const { subscription, loading, error } = useSubscription()

  const subsData = subscription || {}
  const currentSub = subsData.subscription
  const timeInfo = subsData.time_info || {}

  const status = currentSub?.overall_status || currentSub?.status || subsData.tenant?.status
  const statusLabel = STATUS_LABELS[status] || 'Sin suscripción activa'
  const isTrial = status === 'trial'
  const daysRemaining = timeInfo.days_remaining
  const periodEnd = formatDate(currentSub?.current_period_end)
  const graceUntil = formatDate(currentSub?.grace_until)
  const expired = typeof daysRemaining === 'number' && daysRemaining < 0
  const periodEndLabel = expired ? 'Venció el' : isTrial ? 'La prueba termina el' : 'Vigente hasta el'

  const blocked = !subsData.can_access_system
  const expiringSoon = !blocked && typeof daysRemaining === 'number' && daysRemaining <= EXPIRING_SOON_DAYS
  const warn = blocked || expiringSoon || timeInfo.is_in_grace_period

  const businessName = currentUser?.tenant?.business_name || currentUser?.tenant?.name
  const renewalUrl = buildSupportWhatsappUrl(buildSubscriptionRenewalMessage(businessName))

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={20} />
          <h3 className="card-title" style={{ marginBottom: 0 }}>Suscripción</h3>
        </div>
      </div>

      {loading && (
        <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>Cargando tu suscripción...</p>
      )}

      {!loading && error && (
        <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>No se pudo cargar la información de suscripción.</p>
      )}

      {!loading && !error && (
        <>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 0 }}>
            Tu suscripción incluye todas las funciones del sistema. Se renueva por periodos de tiempo.
          </p>

          <div style={{
            marginBottom: '16px', padding: '12px', borderRadius: '8px',
            background: warn ? 'rgba(244,63,94,0.08)' : 'rgba(0,217,165,0.08)',
            border: `1px solid ${warn ? 'rgba(244,63,94,0.2)' : 'rgba(0,217,165,0.2)'}`,
            display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            {warn
              ? <AlertCircle size={20} style={{ color: '#f43f5e', flexShrink: 0, marginTop: '2px' }} />
              : <CheckCircle size={20} style={{ color: '#00d9a5', flexShrink: 0, marginTop: '2px' }} />}
            <div style={{ fontSize: '14px' }}>
              <div>Estado: <strong>{statusLabel}</strong></div>
              {periodEnd && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {periodEndLabel} <strong>{periodEnd}</strong>
                  {typeof daysRemaining === 'number' && daysRemaining >= 0 && (
                    <> ({daysRemaining === 0 ? 'vence hoy' : `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}`})</>
                  )}
                </div>
              )}
              {timeInfo.is_in_grace_period && graceUntil && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Puedes seguir usando el sistema hasta el <strong>{graceUntil}</strong>. Renueva para no perder el acceso.
                </div>
              )}
              {blocked && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Renueva tu suscripción para seguir usando el sistema.
                </div>
              )}
              {expiringSoon && !timeInfo.is_in_grace_period && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Tu suscripción está por vencer. Renueva a tiempo para no interrumpir tus ventas.
                </div>
              )}
            </div>
          </div>

          <a
            className="btn btn-primary"
            href={renewalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <MessageSquare size={16} />
            Renovar por WhatsApp
          </a>
        </>
      )}
    </div>
  )
}
