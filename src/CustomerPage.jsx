import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { formatQuantity, getPriceForSaleUnit, isWeightProduct } from './utils/measurements'

function CustomerPage() {
  const [cart, setCart] = useState([])
  const [cartTotal, setCartTotal] = useState(0)

  useEffect(() => {
    // Sincronizar con localStorage cada segundo
    const syncCart = () => {
      const savedCart = localStorage.getItem('invleo_cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setCart(parsedCart)
        setCartTotal(parsedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0))
      }
    }

    syncCart()
    const interval = setInterval(syncCart, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#ffffff',
      padding: '40px 20px',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#e94560',
          marginBottom: '8px'
        }}>
          invLeo
        </div>
        <div style={{
          fontSize: '24px',
          color: '#a0a0b0'
        }}>
          Salsamentaría & Quesos Frescos
        </div>
      </div>

      {cart && cart.length > 0 ? (
        <div style={{ 
          background: 'rgba(0, 217, 165, 0.15)', 
          border: '3px solid #00d9a5',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '32px', color: '#00d9a5', fontSize: '32px' }}>
            🛒 Pedido Actual
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
            {cart.map(item => (
              (() => {
                const saleUnit = isWeightProduct(item) ? (item.sale_unit || item.unit) : item.unit
                const visibleUnitPrice = isWeightProduct(item) ? getPriceForSaleUnit(item, saleUnit) : item.price

                return (
              <div key={item.id} style={{ 
                background: '#1f1f3a', 
                padding: '16px 32px', 
                borderRadius: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '22px'
              }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: '#a0a0b0', fontSize: '18px' }}>
                  ${visibleUnitPrice.toLocaleString()} x {formatQuantity(item.display_quantity ?? item.quantity)} {saleUnit}
                </span>
                <span style={{ color: '#00d9a5', fontWeight: 700, fontSize: '24px' }}>${(item.price * item.quantity).toLocaleString()}</span>
              </div>
                )
              })()
            ))}
          </div>
          <div style={{ 
            textAlign: 'center', 
            paddingTop: '32px',
            borderTop: '2px solid #2a2a4a'
          }}>
            <span style={{ fontSize: '20px', color: '#a0a0b0' }}>Total a Pagar: </span>
            <span style={{ fontSize: '56px', fontWeight: 700, color: '#e94560', display: 'block', marginTop: '12px' }}>
              ${cartTotal.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '100px', color: '#a0a0b0' }}>
          <ShoppingCart size={100} style={{ opacity: 0.3, marginBottom: '32px' }} />
          <h2 style={{ fontSize: '32px' }}>Esperando pedido...</h2>
          <p style={{ fontSize: '18px', marginTop: '16px' }}>Los productos aparecerán aquí</p>
        </div>
      )}

      <div style={{ 
        textAlign: 'center', 
        marginTop: '60px', 
        color: '#a0a0b0',
        fontSize: '16px'
      }}>
        <p>¡Gracias por su preferencia!</p>
        <p style={{ marginTop: '12px' }}>Visítenos en Calle Principal #123</p>
      </div>
    </div>
  )
}

export default CustomerPage
