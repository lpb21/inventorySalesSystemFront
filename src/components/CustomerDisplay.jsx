import { X, ShoppingCart } from 'lucide-react'

function CustomerDisplay({ products, cart, cartTotal, onClose }) {
  return (
    <div className="customer-display">
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          <X size={18} />
          Cerrar
        </button>
      </div>

      <div className="customer-header">
        <div className="customer-logo">invLeo</div>
        <div className="customer-title">Salsamentaría &amp; Quesos Frescos</div>
      </div>

      {cart && cart.length > 0 ? (
        <div style={{ 
          background: 'rgba(0, 217, 165, 0.15)', 
          border: '2px solid var(--success)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '700px',
          margin: '40px auto'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--success)', fontSize: '28px' }}>
            🛒 Pedido Actual
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
            {cart.map(item => (
              <div key={item.id} style={{ 
                background: 'var(--surface)', 
                padding: '12px 24px', 
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '18px'
              }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>${(item.price || 0).toLocaleString()} x {item.quantity}</span>
                <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '20px' }}>${((item.price || 0) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '2px solid var(--border)' }}>
            <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Total a Pagar: </span>
            <span style={{ fontSize: '48px', fontWeight: 700, color: 'var(--accent)', display: 'block', marginTop: '8px' }}>
              ${cartTotal.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '80px', color: 'var(--text-secondary)' }}>
          <ShoppingCart size={80} style={{ opacity: 0.5, marginBottom: '24px' }} />
          <h2 style={{ fontSize: '24px' }}>Esperando pedido...</h2>
          <p style={{ fontSize: '16px', marginTop: '12px' }}>Los productos aparecerán aquí</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--text-secondary)', fontSize: '14px' }}>
        <p>¡Gracias por su preferencia!</p>
        <p style={{ marginTop: '8px' }}>Visítenos en Calle Principal #123</p>
      </div>
    </div>
  )
}

export default CustomerDisplay
