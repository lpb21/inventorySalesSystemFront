import { useEffect, useState } from 'react'
import {
  ShoppingCart, Minus, Plus, X, DollarSign, Check,
  Milk, Beef, Drumstick, Package, ArrowLeftRight
} from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSalesMutations } from '../../hooks/queries/useSales'
import { useProducts } from '../../hooks/queries/useProducts'
import { useCategories } from '../../hooks/queries/useCategories'
import { useCustomers, useCustomerMutations } from '../../hooks/queries/useCustomers'
import { useDashboardData } from '../../hooks/queries/useDashboard'
import CustomerSelectModal from './CustomerSelectModal'
import {
  convertWeightQuantity,
  formatQuantity,
  getPriceForSaleUnit,
  getWeightSaleUnit,
  isWeightProduct,
  normalizeNumber
} from '../../utils/measurements'

const POS_LAYOUT_STORAGE_KEY = 'invleo_pos_layout'

function SalesView() {
  const {
    cart,
    cartTotal,
    addToCart,
    updateCartQuantity,
    updateCartWeight,
    removeFromCart,
    clearCart,
    addToast
  } = useGlobalContext()

  const { data: products = [] } = useProducts()
  const { data: categories = [] } = useCategories()
  const { data: customers = [] } = useCustomers()
  const { createSale } = useSalesMutations()
  const { registerPayment } = useCustomerMutations()
  
  // Estados para el proceso de venta
  const [completingSale, setCompletingSale] = useState(false)
  const [pendingCreditSale, setPendingCreditSale] = useState(null)
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)

  /**
   * Completa una venta normal (efectivo, nequi, tarjeta).
   * Si el método es 'credit', abre el modal de selección de cliente.
   */
  const completeSale = async (paymentMethod = 'cash', amountReceived = cartTotal) => {
    if (cart.length === 0) return

    // Venta a crédito: recolectar datos y pedir selección de cliente
    if (paymentMethod === 'credit') {
      const saleItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }))
      setPendingCreditSale({ items: saleItems, subtotal: cartTotal, total: cartTotal })
      setShowCustomerSelectModal(true)
      return
    }

    // Venta con pago inmediato
    setCompletingSale(true)
    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        })),
        subtotal: cartTotal,
        discount: 0,
        total: cartTotal,
        payment_method: paymentMethod,
        amount_received: amountReceived,
        change_given: Math.max(0, amountReceived - cartTotal),
        customer_id: null
      }

      await createSale.mutateAsync(saleData)
      clearCart()
      addToast('Venta completada exitosamente!', 'success')
      setShowPayment(false)
      setPaymentAmount('')
    } catch (error) {
      addToast('Error al completar venta', 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  /**
   * Procesa la venta a crédito una vez que el usuario seleccionó el cliente.
   */
  const processCreditSale = async (customer) => {
    if (!pendingCreditSale || !customer) return

    setShowCustomerSelectModal(false)
    setCompletingSale(true)

    try {
      const customerId = customer?.id ? String(customer.id) : null
      if (!customerId) throw new Error('El cliente seleccionado no tiene un ID válido')

      const formattedItems = pendingCreditSale.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))

      const saleData = {
        payment_method: 'credit',
        customer_id: customerId,
        customer_name: customer.name || '',
        subtotal: pendingCreditSale.subtotal,
        discount: 0,
        tax: 0,
        total: pendingCreditSale.total,
        note: 'Venta a crédito',
        items: formattedItems
      }

      await createSale.mutateAsync(saleData)
      clearCart()
      setPendingCreditSale(null)
      addToast('Venta a crédito completada exitosamente!', 'success')
    } catch (error) {
      const errorData = error?.response?.data?.error
      const errorMessage = errorData?.message || error?.message || 'Error al completar venta a crédito'
      addToast(errorMessage, 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [weightDrafts, setWeightDrafts] = useState({})
  const [swappedLayout, setSwappedLayout] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(POS_LAYOUT_STORAGE_KEY) === 'cart-first'
  })

  useEffect(() => {
    localStorage.setItem(POS_LAYOUT_STORAGE_KEY, swappedLayout ? 'cart-first' : 'products-first')
  }, [swappedLayout])

  useEffect(() => {
    setWeightDrafts((prev) => {
      const next = {}
      cart.forEach((item) => {
        if (!isWeightProduct(item)) return
        const saleUnit = item.sale_unit || getWeightSaleUnit(item)
        const displayQuantity = item.display_quantity ?? convertWeightQuantity(item.quantity, item.unit, saleUnit)
        next[item.id] = prev[item.id] ?? formatQuantity(displayQuantity)
      })
      return next
    })
  }, [cart])

  useEffect(() => {
    if (cart.length > 0) return

    setShowPayment(false)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setWeightDrafts({})
  }, [cart.length])

  const filteredProducts = products.filter(p =>
    selectedCategory === 'Todos' || p.category?.name === selectedCategory || p.category === selectedCategory
  )

  const numericPaymentAmount = parseInt(paymentAmount || 0, 10)
  const change = (paymentAmount && numericPaymentAmount >= cartTotal) ? numericPaymentAmount - cartTotal : 0

  return (
    <div className={`pos-container ${swappedLayout ? 'pos-container-swapped' : ''}`}>
      <div className="pos-products">
        <div className="pos-toolbar">
          <h3>Productos</h3>
          <div className="pos-toolbar-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSwappedLayout(prev => !prev)}
            >
              <ArrowLeftRight size={16} />
              Mover paneles
            </button>
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
        </div>

        <div className="product-grid">
          {filteredProducts.map(product => {
            const saleUnit = isWeightProduct(product) ? getWeightSaleUnit(product) : product.unit
            const visiblePrice = isWeightProduct(product)
              ? getPriceForSaleUnit(product, saleUnit)
              : (product.price || 0)

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => addToCart(product)}
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
                      {(product.category?.name === 'Carnes FrÃ­as' || product.category?.name === 'Embutidos') && <Beef size={36} />}
                      {!['Pollo', 'Quesos', 'Carnes FrÃ­as', 'Embutidos'].includes(product.category?.name) && <Package size={36} />}
                    </>
                  )}
                </div>

                <div className="product-name" style={{ fontSize: '14px' }}>{product.name}</div>
                <div className="product-price" style={{ fontSize: '18px' }}>
                  ${visiblePrice.toLocaleString()}
                  {isWeightProduct(product) ? ` / ${saleUnit}` : ''}
                </div>
                <div style={{ fontSize: '12px', color: (product.stock || 0) <= (product.min_stock || product.minStock || 0) ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  Stock: {formatQuantity(product.stock)} {product.unit}
                </div>
              </div>
            )
          })}
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
              <h4>Carrito vaci­o</h4>
              <p>Agrega productos para iniciar una venta</p>
            </div>
          ) : (
            cart.map(item => {
              const weightItem = isWeightProduct(item)
              const saleUnit = item.sale_unit || getWeightSaleUnit(item)
              const displayQuantity = weightItem
                ? item.display_quantity ?? convertWeightQuantity(item.quantity, item.unit, saleUnit)
                : item.quantity
              const maxDisplayQuantity = weightItem
                ? convertWeightQuantity(item.stock, item.unit, saleUnit)
                : item.stock
              const visibleUnitPrice = weightItem ? getPriceForSaleUnit(item, saleUnit) : (item.price || 0)
              const weightDraftValue = weightDrafts[item.id] ?? formatQuantity(displayQuantity)

              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-main">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">
                        ${visibleUnitPrice.toLocaleString()}
                        {weightItem ? ` / ${saleUnit}` : ''} x {formatQuantity(displayQuantity)} {weightItem ? saleUnit : item.unit}
                      </div>
                      {weightItem && saleUnit !== item.unit && (
                        <div className="cart-item-price">
                          Base inventario: {formatQuantity(item.quantity)} {item.unit} a ${(item.price || 0).toLocaleString()} / {item.unit}
                        </div>
                      )}
                    </div>

                    <div className="cart-item-summary">
                      <div className="cart-item-total">
                        ${((item.price || 0) * normalizeNumber(item.quantity, 0)).toLocaleString()}
                      </div>
                      <button
                        className="qty-btn cart-remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-actions">
                    {weightItem ? (
                      <div className="cart-item-weight-controls">
                        <input
                          type="number"
                          className="form-input cart-weight-input"
                          min="0"
                          step="0.01"
                          max={formatQuantity(maxDisplayQuantity)}
                          inputMode="decimal"
                          value={weightDraftValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const rawValue = e.target.value
                            setWeightDrafts(prev => ({ ...prev, [item.id]: rawValue }))

                            const parsedValue = normalizeNumber(rawValue, NaN)
                            if (!Number.isFinite(parsedValue) || parsedValue <= 0) return

                            updateCartWeight(item.id, parsedValue, saleUnit)
                          }}
                          onBlur={() => {
                            const parsedValue = normalizeNumber(weightDraftValue, NaN)
                            if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
                              setWeightDrafts(prev => ({
                                ...prev,
                                [item.id]: formatQuantity(displayQuantity)
                              }))
                              return
                            }

                            updateCartWeight(item.id, parsedValue, saleUnit)
                            setWeightDrafts(prev => ({
                              ...prev,
                              [item.id]: formatQuantity(Math.min(parsedValue, maxDisplayQuantity))
                            }))
                          }}
                        />
                        <select
                          className="form-select cart-weight-select"
                          value={saleUnit}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const nextUnit = e.target.value
                            const nextDisplayQuantity = convertWeightQuantity(item.quantity, item.unit, nextUnit)
                            updateCartWeight(item.id, nextDisplayQuantity, nextUnit)
                            setWeightDrafts(prev => ({
                              ...prev,
                              [item.id]: formatQuantity(nextDisplayQuantity)
                            }))
                          }}
                        >
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                        </select>
                      </div>
                    ) : (
                      <div className="cart-item-qty">
                        <button className="qty-btn" onClick={() => updateCartQuantity(item.id, -1)}>
                          <Minus size={14} />
                        </button>
                        <span className="cart-item-qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateCartQuantity(item.id, 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
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

              {paymentMethod !== 'credit' && numericPaymentAmount >= cartTotal && (
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
                  onClick={() => completeSale(paymentMethod, numericPaymentAmount)}
                  disabled={paymentMethod !== 'credit' && numericPaymentAmount < cartTotal || completingSale}
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

      {showCustomerSelectModal && (
        <CustomerSelectModal
          customers={customers}
          onClose={() => {
            setShowCustomerSelectModal(false)
            setPendingCreditSale(null)
          }}
          onSelectCustomer={processCreditSale}
        />
      )}
    </div>
  )
}

export default SalesView
