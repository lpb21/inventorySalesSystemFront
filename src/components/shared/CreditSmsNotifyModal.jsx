import { useState } from 'react'
import { CheckCircle, MessageSquare, X } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSmsStatus, useSendSmsNotification } from '../../hooks/queries/useSms'
import { buildSupportWhatsappUrl, buildSmsRechargeMessage } from '../../utils/support'

const copFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatCOP = (v) => (Number.isFinite(Number(v)) ? copFmt.format(Number(v)) : '—')

/**
 * Modal tras registrar un fiado o un abono. El tendero decide si le envía
 * al cliente la notificación por SMS (nada se envía automáticamente).
 *
 * props:
 * - title: 'Fiado registrado' | 'Abono registrado'
 * - customer: { name, phone_e164, whatsapp_notifications_enabled }
 * - amountLabel / amount: 'Esta compra' | 'Abono' y su valor
 * - balance: saldo pendiente del cliente tras la operación
 * - target: { type: 'sale', saleId } | { type: 'payment', customerId, paymentId }
 */
function CreditSmsNotifyModal({ title, customer, amountLabel, amount, balance, target, onClose }) {
  const { addToast, currentUser } = useGlobalContext()
  // Siempre fresco: el superadmin pudo activar SMS o acreditar saldo hace un momento
  const { data: smsStatus, isLoading: loadingStatus } = useSmsStatus({ refetchOnMount: 'always' })
  const sendSms = useSendSmsNotification()
  const [sentTo, setSentTo] = useState(null)

  const businessName = currentUser?.tenant?.business_name || currentUser?.tenant?.name
  const supportUrl = buildSupportWhatsappUrl(buildSmsRechargeMessage(businessName))

  const hasPhone = !!customer?.phone_e164
  const customerAllows = customer?.whatsapp_notifications_enabled !== false
  const hasTarget = target?.type === 'sale' ? !!target.saleId : !!target?.paymentId

  const handleSend = async () => {
    try {
      const result = await sendSms.mutateAsync(target)
      if (result?.sent) {
        setSentTo(result.to || true)
        addToast(result.message || 'Notificación SMS enviada', 'success')
      } else {
        addToast(result?.message || 'No se pudo enviar el SMS', 'warning')
      }
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || 'No se pudo enviar el SMS'
      addToast(message, 'error')
    }
  }

  const renderSmsAction = () => {
    if (sentTo) {
      return (
        <p style={{ color: 'var(--success)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
          ✓ Notificación SMS enviada{typeof sentTo === 'string' ? ` a ${sentTo}` : ''}
        </p>
      )
    }
    if (!hasPhone) {
      return <Hint>Este cliente no tiene celular registrado</Hint>
    }
    if (!customerAllows) {
      return <Hint>Avisos por SMS desactivados para este cliente (Configuración &gt; Clientes)</Hint>
    }
    if (!hasTarget || loadingStatus) {
      return null
    }
    if (!smsStatus?.sms_enabled) {
      return (
        <>
          <Hint>Los SMS a clientes no están activos en tu cuenta.</Hint>
          <SupportLink href={supportUrl}>Solicitar activación por WhatsApp</SupportLink>
        </>
      )
    }
    if (smsStatus.sms_balance <= 0) {
      return (
        <>
          <Hint>No te quedan SMS para notificar a tu cliente.</Hint>
          <SupportLink href={supportUrl}>Recarga aquí por WhatsApp</SupportLink>
        </>
      )
    }
    return (
      <>
        <button
          className="btn btn-success"
          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handleSend}
          disabled={sendSms.isPending}
        >
          <MessageSquare size={18} />
          {sendSms.isPending ? 'Enviando...' : 'Enviar notificación por SMS'}
        </button>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', margin: '8px 0 0' }}>
          Usa 1 SMS · Te quedan {smsStatus.sms_balance}
        </p>
      </>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--success)',
            }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="modal-title">{title}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {customer?.name}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
            padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{amountLabel}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCOP(amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Saldo pendiente</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>
                {formatCOP(balance)}
              </div>
            </div>
          </div>

          {renderSmsAction()}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            {sentTo ? 'Listo' : 'Cerrar sin notificar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Hint({ children }) {
  return (
    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', margin: '0 0 8px' }}>
      {children}
    </p>
  )
}

function SupportLink({ href, children }) {
  return (
    <a
      className="btn btn-primary"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
    >
      <MessageSquare size={18} />
      {children}
    </a>
  )
}

export default CreditSmsNotifyModal
