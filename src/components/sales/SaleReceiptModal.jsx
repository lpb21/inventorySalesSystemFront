import { useMemo, useRef, useState } from 'react'
import { Receipt, Printer, X } from 'lucide-react'
import Modal from '../shared/Modal'
import { buildReceiptHtml, formatMoney } from '../../utils/receipt'

// Recibo de compra de una venta (última venta en el POS o historial). La vista previa y la
// impresión salen del mismo documento (iframe), así lo que se ve es lo que se imprime.
function SaleReceiptModal({ receipt, onClose }) {
  const frameRef = useRef(null)
  const [frameHeight, setFrameHeight] = useState(360)
  const html = useMemo(() => (receipt ? buildReceiptHtml(receipt) : ''), [receipt])

  if (!receipt) return null

  const isCredit = receipt.paymentMethod === 'credit'

  const handlePrint = () => {
    const frameWindow = frameRef.current?.contentWindow
    if (!frameWindow) return
    frameWindow.focus()
    frameWindow.print()
  }

  return (
    <Modal onClose={onClose} title="Recibo de compra" maxWidth="420px">
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
            <Receipt size={24} />
          </div>
          <div>
            <h3 className="modal-title">Recibo de compra</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Recibo N° {receipt.ticketNumber}
              {!isCredit && ` · Cambio ${formatMoney(receipt.change)}`}
            </p>
          </div>
        </div>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <div className="modal-body">
        <iframe
          ref={frameRef}
          title="Vista previa del recibo"
          srcDoc={html}
          onLoad={(e) => {
            const height = e.target.contentDocument?.documentElement?.scrollHeight
            if (height) setFrameHeight(height)
          }}
          style={{
            width: '100%',
            height: `${frameHeight}px`,
            maxHeight: '50vh',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: '#fff'
          }}
        />
      </div>

      <div className="modal-footer" style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePrint}>
          <Printer size={18} />
          Imprimir recibo
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  )
}

export default SaleReceiptModal
