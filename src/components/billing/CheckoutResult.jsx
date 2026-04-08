import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Check, AlertTriangle, Clock } from 'lucide-react'
import { useSubscription } from '../../hooks/useSubscription'

export default function CheckoutResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refetch } = useSubscription()
  const [status, setStatus] = useState('processing')

  const refPayco = searchParams.get('ref_payco')
  const response = searchParams.get('x_response')
  const transactionId = searchParams.get('x_transaction_id')

  useEffect(() => {
    const processPayment = async () => {
      try {
        setStatus('processing')

        // Dar algo de tiempo al backend para procesar el webhook
        setTimeout(async () => {
          await refetch()

          if (response === 'Aceptada') {
            setStatus('success')
          } else if (response === 'Rechazada' || response === 'Fallida') {
            setStatus('error')
          } else {
            setStatus('pending')
          }
        }, 3000)
      } catch (e) {
        setStatus('error')
      }
    }

    if (refPayco && response) {
      processPayment()
    } else {
      setStatus('error')
    }
  }, [refPayco, response, refetch])

  const renderIcon = () => {
    if (status === 'success') return <Check size={40} />
    if (status === 'pending') return <Clock size={40} />
    if (status === 'processing') return <Clock size={40} />
    return <AlertTriangle size={40} />
  }

  const renderTitle = () => {
    if (status === 'success') return '¡Pago exitoso!'
    if (status === 'pending') return 'Pago pendiente'
    if (status === 'processing') return 'Procesando tu pago...'
    return 'Pago no completado'
  }

  const renderMessage = () => {
    if (status === 'success') {
      return 'Tu suscripción ha sido actualizada correctamente. Puedes seguir usando el sistema con tu nuevo plan.'
    }
    if (status === 'pending') {
      return 'Tu pago está siendo procesado por la pasarela. Te notificaremos cuando se complete.'
    }
    if (status === 'processing') {
      return 'Estamos verificando el estado de tu transacción. Esto puede tardar unos segundos.'
    }
    return 'Hubo un problema al procesar tu pago. Si el problema persiste, puedes intentar nuevamente o contactar soporte.'
  }

  return (
    <div style={{ padding: '32px' }}>
      <div className="card" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(233,69,96,0.06)',
              marginBottom: 4,
            }}
          >
            {renderIcon()}
          </div>
          <h2 className="card-title" style={{ marginBottom: 0 }}>{renderTitle()}</h2>
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{renderMessage()}</p>

          {(transactionId || refPayco) && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                textAlign: 'left',
                marginBottom: 16,
              }}
            >
              {transactionId && (
                <div>
                  <strong>ID de transacción:</strong> {transactionId}
                </div>
              )}
              {refPayco && (
                <div>
                  <strong>Referencia ePayco:</strong> {refPayco}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/settings')}>
              Ir a Configuración
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/') }>
              Ir al Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
