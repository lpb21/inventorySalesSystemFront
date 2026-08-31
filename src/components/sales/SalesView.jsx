import { useEffect, useState } from 'react'
import {
  ShoppingCart, Minus, Plus, X, DollarSign, Check,
  Milk, Beef, Drumstick, Package, ArrowLeftRight,
  Clock, Power, AlertCircle, CheckCircle, ScanLine
} from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSalesMutations } from '../../hooks/queries/useSales'
import { useProducts } from '../../hooks/queries/useProducts'
import { productsAPI } from '../../api/config'
import { calculateChange, canCompleteSale, buildSaleItems } from '../../utils/salesLogic'
import { useCategories } from '../../hooks/queries/useCategories'
import { useCustomers, useCustomerMutations } from '../../hooks/queries/useCustomers'
import { useCashRegister } from '../../hooks/useCashRegister'
import CustomerSelectModal from './CustomerSelectModal'
import OpenCashRegisterModal from './OpenCashRegisterModal'
import CloseCashRegisterModal from './CloseCashRegisterModal'
import {
  convertWeightQuantity,
  formatQuantity,
  getPriceForSaleUnit,
  getWeightSaleUnit,
  isWeightProduct,
  normalizeNumber
} from '../../utils/measurements'
 
const POS_LAYOUT_STORAGE_KEY = 'invah_pos_layout'
 
function SalesView() {
  const {
    cart,
    cartTotal,
    addToCart,
    updateCartQuantity,
    updateCartWeight,
    removeFromCart,
    clearCart,
    addToast,
    currentUser
  } = useGlobalContext()
 
  const { data: products = [] } = useProducts()
  const { data: categories = [] } = useCategories()
  const { data: customers = [] } = useCustomers({ isActive: true })
  const { createSale } = useSalesMutations()
  const { registerPayment } = useCustomerMutations()
 
  // Hook de turnos de caja
  const {
    activeShift,
    hasActiveShift,
    isShiftOpen,
    loadingActiveShift,
    openShift,
    closeShift,
    isOpeningShift,
    isClosingShift
  } = useCashRegister()
 
  // Estados para el proceso de venta
  const [completingSale, setCompletingSale] = useState(false)
 
  // --- Escaneo de código de barras ---
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning] = useState(false)
 
  const handleBarcodeScan = async (e) => {
    e.preventDefault()
    const code = barcodeInput.trim()
    if (!code) return
 
    setScanning(true)
    try {
      // 1) Buscar primero entre los productos ya cargados (instantáneo)
      let product = products.find(p => p.barcode === code)
 
      // 2) Si no está en memoria, consultar al backend
      if (!product) {
        const response = await productsAPI.searchByBarcode(code)
        product = response?.data || response
      }
 
      if (product && product.id) {
        addToCart(product)
        addToast(`${product.name} agregado`, 'success')
        setBarcodeInput('')
      } else {
        addToast(`No se encontró un producto con el código ${code}`, 'error')
        setBarcodeInput('')
      }
    } catch (error) {
      addToast(`Producto no encontrado (${code})`, 'error')
      setBarcodeInput('')
    } finally {
      setScanning(false)
    }
  }
  const [pendingCreditSale, setPendingCreditSale] = useState(null)
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)
 
  // Estados para modales de turnos
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false)
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false)
 
  // Funciones para manejar turnos
  const handleOpenShift = async (shiftData) => {
    try {
      await openShift(shiftData)
      addToast('Turno de caja abierto exitosamente', 'success')
      setShowOpenShiftModal(false)
    } catch (error) {
      // Error ya se maneja en el modal
      throw error
    }
  }
 
  const handleCloseShift = async (shiftId, closeData) => {
    try {
      await closeShift({ shiftId, data: closeData })
      addToast('Turno de caja cerrado exitosamente', 'success')
      setShowCloseShiftModal(false)
    } catch (error) {
      // Error ya se maneja en el modal
      throw error
    }
  }
 
  /**
   * Completa una venta normal (efectivo, nequi, tarjeta).
   * Si el método es 'credit', abre el modal de selección de cliente.
   */
  const completeSale = async (paymentMethod = 'cash', amountReceived = cartTotal) => {
    if (cart.length === 0) return
 
    // Verificar si hay turno activo - SOLO para cajeros
    if (currentUser?.role === 'cashier' && !isShiftOpen) {
      addToast('Debes abrir un turno de caja antes de realizar ventas', 'warning')
      setShowOpenShiftModal(true)
      return
    }
 
    // Venta a crédito: recolectar datos y pedir selección de cliente
    if (paymentMethod === 'credit') {
      const saleItems = buildSaleItems(cart)
      setPendingCreditSale({ items: saleItems, subtotal: cartTotal, total: cartTotal })
      setShowCustomerSelectModal(true)
      return
    }
 
    // Venta con pago inmediato
    setCompletingSale(true)
    try {
      const saleData = {
        items: buildSaleItems(cart),
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
      // Manejar error específico de turno no abierto - solo para cajeros
      const errorCode = error?.response?.data?.error?.code
      if (currentUser?.role === 'cashier' &&
          errorCode === 'VALIDATION_ERROR' &&
          error?.response?.data?.error?.message?.includes('turno de caja')) {
        addToast('Debes abrir un turno de caja antes de realizar ventas', 'warning')
        setShowOpenShiftModal(true)
      } else {
        addToast('Error al completar venta', 'error')
      }
    } finally {
      setCompletingSale(false)
    }
  }
 
  /**
   * Procesa la venta a crédito una vez que el usuario seleccionó el cliente.
   */
  const processCreditSale = async (customer) => {
    if (!pendingCreditSale || !customer) return
 
    // Verificar si hay turno activo - SOLO para cajeros
    if (currentUser?.role === 'cashier' && !isShiftOpen) {
      addToast('Debes abrir un turno de caja antes de realizar ventas', 'warning')
      setShowCustomerSelectModal(false)
      setShowOpenShiftModal(true)
      return
    }
 
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
 
      // Manejar error específico de turno no abierto - solo para cajeros
      if (currentUser?.role === 'cashier' &&
          errorData?.code === 'VALIDATION_ERROR' &&
          errorMessage.includes('turno de caja')) {
        addToast('Debes abrir un turno de caja antes de realizar ventas', 'warning')
        setShowOpenShiftModal(true)
      } else {
        addToast(errorMessage, 'error')
      }
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

    // Emitir el carrito a la pantalla cliente (ventana aparte) vía BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('pos-customer-display')

    // Emitir el estado actual del carrito
    const emitCart = () => {
      channel.postMessage({
        type: 'cart-update',
        cart,
        cartTotal,
      })
    }

    // Emitir cada vez que cambie el carrito
    emitCart()

    // Si la pantalla cliente pide el estado (al abrirse), se lo mandamos
    channel.onmessage = (event) => {
      if (event.data?.type === 'request-cart') {
        emitCart()
      }
    }

    return () => channel.close()
  }, [cart, cartTotal])
 
  const filteredProducts = products.filter(p => {
    const isCategoryMatch = selectedCategory === 'Todos' || p.category?.name === selectedCategory || p.category === selectedCategory
    const isActive = p.is_active !== false
    return isCategoryMatch && isActive
  })
 
  const numericPaymentAmount = parseInt(paymentAmount || 0, 10)
  const change = calculateChange(numericPaymentAmount, cartTotal)
 
  return (
    <div className={`pos-container ${swappedLayout ? 'pos-container-swapped' : ''}`}>
      <div className="pos-products">
        <div className="pos-toolbar">
          <h3>Productos</h3>
 
          {/* Campo de escaneo de código de barras */}
          <form onSubmit={handleBarcodeScan} style={{ flex: 1, maxWidth: '280px', margin: '0 12px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '10px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}>
                <ScanLine size={16} />
              </div>
              <input
                type="text"
                className="form-input"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanea o escribe el código..."
                style={{ paddingLeft: '34px', height: '38px' }}
                disabled={scanning}
                autoComplete="off"
              />
            </div>
          </form>
 
          <div className="pos-toolbar-actions">
            {/* <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSwappedLayout(prev => !prev)}
            >
              <ArrowLeftRight size={16} />
              Mover paneles
            </button> */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3>Carrito de Venta</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {cart.length} producto{cart.length !== 1 ? 's' : ''}
            </span>
          </div>
 
          {/* Indicador de Estado de Turno - Solo para cajeros */}
          {currentUser?.role === 'cashier' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loadingActiveShift ? (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid var(--border)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Verificando turno...
                </div>
              ) : isShiftOpen ? (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid var(--success)',
                  fontSize: '12px',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}>
                  <CheckCircle size={14} />
                  Turno Activo
                </div>
              ) : (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid var(--warning)',
                  fontSize: '12px',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}>
                  <AlertCircle size={14} />
                  Sin Turno
                </div>
              )}
 
              {/* Botones de Turno - Solo para cajeros */}
              {!loadingActiveShift && (
                <>
                  {!isShiftOpen ? (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => setShowOpenShiftModal(true)}
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
                      onClick={() => setShowCloseShiftModal(true)}
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
          )}
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
                  disabled={!canCompleteSale({ paymentMethod, paymentAmount: numericPaymentAmount, total: cartTotal, cartLength: cart.length }) || completingSale}
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
 
      {/* Modales de Turnos de Caja */}
      {showOpenShiftModal && (
        <OpenCashRegisterModal
          userName={currentUser?.name}
          onOpen={handleOpenShift}
          onClose={() => setShowOpenShiftModal(false)}
          isOpening={isOpeningShift}
        />
      )}
 
      {showCloseShiftModal && activeShift && (
        <CloseCashRegisterModal
          activeShift={activeShift}
          onClose={() => setShowCloseShiftModal(false)}
          onCloseShift={handleCloseShift}
          isClosing={isClosingShift}
        />
      )}
    </div>
  )
}
 
export default SalesView