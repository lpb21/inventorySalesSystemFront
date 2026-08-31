import { CheckCircle, AlertCircle, Clock, Power } from 'lucide-react'
 
/**
 * CashRegisterStatus — Indicador del estado del turno de caja + botones abrir/cerrar.
 * Solo se muestra para cajeros. Extraído de SalesView para aligerar el carrito.
 */
function CashRegisterStatus({
  currentUser,
  loadingActiveShift,
  isShiftOpen,
  isOpeningShift,
  isClosingShift,
  onOpenShift,
  onCloseShift,
}) {
  // Solo aplica a cajeros
  if (currentUser?.role !== 'cashier') return null
 
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {loadingActiveShift ? (
        <div style={{
          padding: '6px 12px', borderRadius: '6px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          fontSize: '12px', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span style={{
            width: '12px', height: '12px',
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          Verificando turno...
        </div>
      ) : isShiftOpen ? (
        <div style={{
          padding: '6px 12px', borderRadius: '6px',
          background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--success)',
          fontSize: '12px', color: 'var(--success)',
          display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500'
        }}>
          <CheckCircle size={14} />
          Turno Activo
        </div>
      ) : (
        <div style={{
          padding: '6px 12px', borderRadius: '6px',
          background: 'rgba(255, 193, 7, 0.15)', border: '1px solid var(--warning)',
          fontSize: '12px', color: 'var(--warning)',
          display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500'
        }}>
          <AlertCircle size={14} />
          Sin Turno
        </div>
      )}
 
      {/* Botones de turno */}
      {!loadingActiveShift && (
        <>
          {!isShiftOpen ? (
            <button
              className="btn btn-success btn-sm"
              onClick={onOpenShift}
              disabled={isOpeningShift}
              title="Abrir turno de caja"
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <Clock size={14} />
              Abrir Turno
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onCloseShift}
              disabled={isClosingShift}
              title="Cerrar turno de caja"
            >
              <Power size={14} />
              Cerrar Turno
            </button>
          )}
        </>
      )}
    </div>
  )
}
 
export default CashRegisterStatus