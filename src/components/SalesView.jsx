import { useState } from 'react'
import { 
  ShoppingCart, Minus, Plus, X, DollarSign, Check,
  Milk, Beef, Drumstick, Package
} from 'lucide-react'


function SalesView({ products, cart, onAddToCart, onUpdateQuantity, onRemoveItem, onCompleteSale, cartTotal, categories, completingSale }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')


  const filteredProducts = products.filter(p =>
    selectedCategory === 'Todos' || p.category?.name === selectedCategory || p.category === selectedCategory
  )

  const change = (paymentAmount && parseInt(paymentAmount) >= cartTotal) ? parseInt(paymentAmount) - cartTotal : 0

  return (
    <div className="pos-container">
      <div className="pos-products">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Productos</h3>
          <div className="category-tabs" style={{ marginBottom: 0 }}>
            {['Todos', ...categories.map(c => c.name)].map(cat => (
              <button 
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="product-card"
              onClick={() => onAddToCart(product)}
              style={{ cursor: 'pointer' }}
            >
              <div className="product-image" style={{ height: '100px' }}>
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <>
                    {product.category?.name === 'Pollo' && <Drumstick size={36} />}
                    {product.category?.name === 'Quesos' && <Milk size={36} />}
                    {(product.category?.name === 'Carnes Frías' || product.category?.name === 'Embutidos') && <Beef size={36} />}
                    {!['Pollo', 'Quesos', 'Carnes Frías', 'Embutidos'].includes(product.category?.name) && <Package size={36} />}
                  </>
                )}
              </div>

              <div className="product-name" style={{ fontSize: '14px' }}>{product.name}</div>
              <div className="product-price" style={{ fontSize: '18px' }}>
                ${(product.price || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: (product.stock || 0) <= (product.min_stock || product.minStock || 0) ? 'var(--danger)' : 'var(--text-secondary)' }}>
                Stock: {product.stock} {product.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pos-cart">
        <div className="cart-header">
          <h3>Carrito de Venta</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {cart.length} producto{cart.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <ShoppingCart size={48} />
              <h4>Carrito vacío</h4>
              <p>Agrega productos para iniciar una venta</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">${(item.price || 0).toLocaleString()} x {item.quantity} {item.unit}</div>
                </div>
                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, -1)}>
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="cart-item-total">
                    ${((item.price || 0) * item.quantity).toLocaleString()}
                  </div>
                  <button 
                    className="qty-btn" 
                    style={{ background: 'var(--danger)', width: '24px', height: '24px' }}
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span className="cart-total-label">Total</span>
            <span className="cart-total-value">${cartTotal.toLocaleString()}</span>
          </div>
          
          {showPayment ? (
            <div>
              <div className="form-group">
                <label className="form-label">Forma de Pago</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ marginBottom: '12px' }}
                >
                  <option value="cash">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="card">Tarjeta</option>
                  <option value="credit">Credito</option>
                </select>
              </div>
              {paymentMethod !== 'credit' && (
                <div className="form-group">
                  <label className="form-label">Monto Recibido</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ingrese el monto"
                    autoFocus
                  />
                </div>
              )}

              {paymentMethod !== 'credit' && parseInt(paymentAmount || 0) >= cartTotal && (

                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(0, 217, 165, 0.15)', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cambio</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                    ${change.toLocaleString()}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPayment(false)} disabled={completingSale}>
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={() => onCompleteSale(paymentMethod, parseInt(paymentAmount || 0))}
                  disabled={paymentMethod !== 'credit' && parseInt(paymentAmount || 0) < cartTotal || completingSale}
                >

                  {completingSale ? (
                    <>
                      <span style={{ 
                        width: '18px', 
                        height: '18px', 
                        border: '2px solid rgba(255,255,255,0.3)', 
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block',
                        marginRight: '8px'
                      }} />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Completar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%' }}
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
            >
              <DollarSign size={20} />
              Cobrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalesView
