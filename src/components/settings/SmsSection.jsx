import { MessageSquare, AlertCircle, CheckCircle } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSmsStatus } from '../../hooks/queries/useSms'
import { buildSupportWhatsappUrl, buildSmsRechargeMessage } from '../../utils/support'

const LOW_BALANCE = 5

const copFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

/**
 * Saldo de SMS del negocio para avisos automáticos a clientes de fiado,
 * paquetes disponibles y botón de recarga por WhatsApp.
 */
export default function SmsSection() {
  const { currentUser } = useGlobalContext()
  const { data: status, isLoading, error } = useSmsStatus()

  const businessName = currentUser?.tenant?.business_name || currentUser?.tenant?.name
  const rechargeUrl = buildSupportWhatsappUrl(buildSmsRechargeMessage(businessName))

  const balance = status?.sms_balance ?? 0
  const isEmpty = status?.sms_enabled && balance <= 0
  const isLow = status?.sms_enabled && balance > 0 && balance <= LOW_BALANCE

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} />
          <h3 className="card-title" style={{ marginBottom: 0 }}>Mensajes SMS</h3>
        </div>
        {status?.sms_enabled && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Enviados este mes: <strong>{status.sent_this_month}</strong>
          </div>
        )}
      </div>

      {isLoading && (
        <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>Cargando saldo de SMS...</p>
      )}

      {!isLoading && error && (
        <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>No se pudo cargar el saldo de SMS.</p>
      )}

      {!isLoading && !error && status && (
        <>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 0 }}>
            Cada vez que registras un fiado o un abono, tu cliente recibe un SMS con el valor y su saldo
            pendiente. Cada SMS usa 1 crédito.
          </p>

          {!status.sms_enabled ? (
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Los avisos por SMS no están activos en tu cuenta. Escríbenos para activarlos.
            </div>
          ) : (
            <div style={{
              marginBottom: '16px', padding: '12px', borderRadius: '8px',
              background: isEmpty || isLow ? 'rgba(244,63,94,0.08)' : 'rgba(0,217,165,0.08)',
              border: `1px solid ${isEmpty || isLow ? 'rgba(244,63,94,0.2)' : 'rgba(0,217,165,0.2)'}`,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              {isEmpty || isLow
                ? <AlertCircle size={20} style={{ color: '#f43f5e', flexShrink: 0 }} />
                : <CheckCircle size={20} style={{ color: '#00d9a5', flexShrink: 0 }} />}
              <div style={{ fontSize: '14px' }}>
                <div>Te quedan <strong style={{ fontSize: '18px' }}>{balance}</strong> SMS</div>
                {isEmpty && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Tus clientes no están recibiendo avisos. Recarga para reactivarlos.
                  </div>
                )}
                {isLow && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Te quedan pocos SMS. Recarga para no dejar de avisar a tus clientes.
                  </div>
                )}
              </div>
            </div>
          )}

          {Array.isArray(status.packages) && status.packages.length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Paquete</th>
                    <th style={{ textAlign: 'right' }}>SMS</th>
                    <th style={{ textAlign: 'right' }}>Precio</th>
                    <th style={{ textAlign: 'right' }}>Por SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {status.packages.map(pkg => (
                    <tr key={pkg.code}>
                      <td>{pkg.name}</td>
                      <td style={{ textAlign: 'right' }}>{pkg.credits}</td>
                      <td style={{ textAlign: 'right' }}>{copFmt.format(pkg.price_cop)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {copFmt.format(pkg.price_cop / pkg.credits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <a
            className="btn btn-primary"
            href={rechargeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <MessageSquare size={16} />
            {status.sms_enabled ? 'Recarga aquí por WhatsApp' : 'Solicitar activación por WhatsApp'}
          </a>
        </>
      )}
    </div>
  )
}
