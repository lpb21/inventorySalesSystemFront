import { CheckCircle, MessageCircle, X } from 'lucide-react'
import { buildWaUrl, buildChargeMessage, openWhatsApp } from '../../utils/whatsapp'

function CreditSaleWhatsappModal({ sale, businessName, onClose }) {
  if (!sale) return null

  const { customer, items, total, balance, date } = sale
  const canNotify = customer.whatsapp_notifications_enabled !== false && !!customer.phone_e164

  const message = canNotify
    ? buildChargeMessage({
        customerName: customer.name,
        businessName: businessName || 'Mi Negocio',
        date,
        items: items.map(i => ({
          name: i.name,
          quantity: i.sale_unit ? i.display_quantity : i.quantity,
          unit: i.sale_unit || 'und',
          subtotal: (i.price || 0) * (i.quantity || 0),
        })),
        total,
        balance,
      })
    : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
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
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="modal-title">Fiado registrado</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {customer.name}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Esta compra</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${total?.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Saldo pendiente</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>
                ${balance?.toLocaleString()}
              </div>
            </div>
          </div>

          {canNotify ? (
            <button
              className="btn btn-success"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                openWhatsApp(buildWaUrl(customer.phone_e164, message))
                onClose()
              }}
            >
              <MessageCircle size={18} />
              Enviar comprobante por WhatsApp
            </button>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
              {customer.phone_e164
                ? 'Notificaciones WhatsApp desactivadas para este cliente'
                : 'Este cliente no tiene celular registrado'}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreditSaleWhatsappModal