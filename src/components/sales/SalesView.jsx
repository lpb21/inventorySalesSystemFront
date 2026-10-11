import { useEffect, useRef, useState } from 'react'
import {
  ShoppingCart, Minus, Plus, X, DollarSign, Check,
  ArrowLeftRight,
  Clock, Power, AlertCircle, CheckCircle, ScanLine, Receipt, AlertTriangle
} from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSalesMutations } from '../../hooks/queries/useSales'
import { useProducts } from '../../hooks/queries/useProducts'
import { productsAPI } from '../../api/config'
import { calculateChange, canCompleteSale, buildSaleItems } from '../../utils/salesLogic'
import { buildReceiptData } from '../../utils/receipt'
import CreditSmsNotifyModal from '../shared/CreditSmsNotifyModal'
import { useCategories } from '../../hooks/queries/useCategories'
import { useCustomers, useCustomerMutations } from '../../hooks/queries/useCustomers'
import { useCashRegister } from '../../hooks/useCashRegister'
import CashRegisterStatus from './CashRegisterStatus'
import CustomerSelectModal from './CustomerSelectModal'
import OpenCashRegisterModal from './OpenCashRegisterModal'
import CloseCashRegisterModal from './CloseCashRegisterModal'
import ProductGrid from './ProductGrid'
import SaleReceiptModal from './SaleReceiptModal'
import DiscountAuthorizationModal from './DiscountAuthorizationModal'
import { can } from '../../utils/permissions'
import {
  cartHasDiscounts,
  getCartDiscountTotal,
  getDiscountSettings,
  getLineGross,
  getLineTotal,
  isBelowCost,
  normalizeDiscountPercent
} from '../../utils/discounts'
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
    setCartDiscount,
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

  // --- Descuentos por línea ---
  // Supervisor, admin y owner los aplican directo; el cajero los solicita y
  // alguien de perfil mayor los aprueba al cobrar (DiscountAuthorizationModal).
  const canApplyDiscount = can(currentUser, 'canDiscount')
  const canSeeCosts = can(currentUser, 'canViewCosts')
  const discountSettings = getDiscountSettings(currentUser?.tenant)
  const [discountOpen, setDiscountOpen] = useState({})
  const [discountDrafts, setDiscountDrafts] = useState({})
  const [pendingDiscountAuth, setPendingDiscountAuth] = useState(null)
  const cartDiscountTotal = getCartDiscountTotal(cart)

  const toggleDiscount = (item, checked) => {
    setDiscountOpen(prev => ({ ...prev, [item.id]: checked }))
    if (!checked) {
      setCartDiscount(item.id, 0)
      setDiscountDrafts(prev => ({ ...prev, [item.id]: '' }))
    }
  }
 
  // --- Escaneo de código de barras ---
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const barcodeInputRef = useRef(null)

  const handleBarcodeScan = async (e) => {
    e.preventDefault()
    if (scanning) return
    const code = barcodeInput.trim()
    if (!code) return

    setScanning(true)
    try {
      // 1) Buscar primero entre los productos ya cargados (instantáneo)
      let product = products.find(p => p.barcode === code)

      // 2) Si no está en memoria, consultar al backend (con timeout para no bloquear el input)
      if (!product) {
        const response = await Promise.race([
          productsAPI.searchByBarcode(code),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ])
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
      addToast(
        error?.message === 'timeout'
          ? 'La búsqueda tardó demasiado, intenta de nuevo'
          : `Producto no encontrado (${code})`,
        'error'
      )
      setBarcodeInput('')
    } finally {
      setScanning(false)
      barcodeInputRef.current?.focus()
    }
  }
  const [pendingCreditSale, setPendingCreditSale] = useState(null)
  const [lastCreditSale, setLastCreditSale] = useState(null)
  // Recibo de la última venta: no se abre solo, queda disponible en un botón
  const [lastReceipt, setLastReceipt] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
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
  const completeSale = async (paymentMethod = 'cash', amountReceived = cartTotal, discountToken = null) => {
    if (cart.length === 0) return
 
    // Verificar si hay turno activo - SOLO para cajeros
    if (currentUser?.role === 'cashier' && !isShiftOpen) {
      addToast('Debes abrir un turno de caja antes de realizar ventas', 'warning')
      setShowOpenShiftModal(true)
      return
    }
 
    // El cajero necesita que un perfil mayor apruebe los descuentos antes de cobrar
    if (cartHasDiscounts(cart) && !canApplyDiscount && !discountToken) {
      setPendingDiscountAuth({ paymentMethod, amountReceived })
      return
    }

    // Venta a crédito: recolectar datos y pedir selección de cliente
    if (paymentMethod === 'credit') {
      const saleItems = buildSaleItems(cart)
      setPendingCreditSale({ items: saleItems, cartSnapshot: cart, subtotal: cartTotal, total: cartTotal, discountToken })
      setShowCustomerSelectModal(true)
      return
    }
 
    // Venta con pago inmediato
    setCompletingSale(true)
    try {
      const saleData = {
        items: buildSaleItems(cart),
        subtotal: cartTotal,
        total: cartTotal,
        discount_authorization_token: discountToken,
        payment_method: paymentMethod,
        amount_received: amountReceived,
        // El back lee payment_received; sin él guardaba el total como monto recibido
        payment_received: amountReceived,
        change_given: Math.max(0, amountReceived - cartTotal),
        customer_id: null
      }
 
      const result = await createSale.mutateAsync(saleData)
      setLastReceipt(buildReceiptData({
        sale: { payment_method: paymentMethod, ...result },
        cart,
        tenant: currentUser?.tenant,
        cashierName: currentUser?.name,
        amountReceived,
      }))
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
        const apiError = error?.response?.data?.error
        const detailMessage = Array.isArray(apiError?.details) && apiError.details.length
          ? apiError.details.join(', ')
          : null
        addToast(detailMessage || apiError?.message || 'Error al completar venta', 'error')
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
        unit_price: item.unit_price,
        discount_percent: item.discount_percent
      }))
 
      const saleData = {
        payment_method: 'credit',
        customer_id: customerId,
        customer_name: customer.name || '',
        subtotal: pendingCreditSale.subtotal,
        discount_authorization_token: pendingCreditSale.discountToken,
        tax: 0,
        total: pendingCreditSale.total,
        note: 'Venta a crédito',
        items: formattedItems
      }
 
      const result = await createSale.mutateAsync(saleData)
      const canNotify = customer.whatsapp_notifications_enabled !== false && !!customer.phone_e164
      if (canNotify) {
        setLastCreditSale({
          saleId: result?.id,
          customer,
          total: result?.total ?? pendingCreditSale.total,
          balance: result?.customer_credit_balance ?? null,
        })
      }
      setLastReceipt(buildReceiptData({
        sale: { payment_method: 'credit', ...result },
        cart: pendingCreditSale.cartSnapshot,
        tenant: currentUser?.tenant,
        cashierName: currentUser?.name,
        customer,
        creditBalance: result?.customer_credit_balance ?? null,
      }))
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
    setDiscountOpen({})
    setDiscountDrafts({})
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
    const hasStock = normalizeNumber(p.stock, 0) > 0
    return isCategoryMatch && isActive && hasStock
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
                ref={barcodeInputRef}
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="form-input"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanea o escribe el código..."
                style={{ paddingLeft: '34px', height: '38px' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Categoría:
              </span>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '140px' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {['Todos', ...categories.map(c => c.name)].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
 
        <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
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
          <CashRegisterStatus
            currentUser={currentUser}
            loadingActiveShift={loadingActiveShift}
            isShiftOpen={isShiftOpen}
            isOpeningShift={isOpeningShift}
            isClosingShift={isClosingShift}
            onOpenShift={() => setShowOpenShiftModal(true)}
            onCloseShift={() => setShowCloseShiftModal(true)}
          />
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
              const discountPercent = normalizeDiscountPercent(item.discount_percent)
              const discountChecked = discountOpen[item.id] ?? discountPercent > 0
              const discountInputId = `discount-${item.id}`
 
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
                        {discountPercent > 0 && (
                          <span className="cart-item-original">${getLineGross(item).toLocaleString()}</span>
                        )}
                        ${getLineTotal(item).toLocaleString()}
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
                            // Avisar si se pidió más de lo disponible (se recortará al stock)
                            if (parsedValue > maxDisplayQuantity) {
                              addToast(
                                `Solo hay ${formatQuantity(maxDisplayQuantity)} ${saleUnit} de ${item.name} en stock`,
                                'warning'
                              )
                            }
                            setWeightDrafts(prev => ({
                              ...prev,
                              [item.id]: formatQuantity(Math.min(parsedValue, maxDisplayQuantity))
                            }))
                          }}
                        />
                        {/* Venta siempre en la unidad del producto (todo en libras).
                            El selector kg/lb se retiró; si se reactiva la conversión,
                            ver historial de git. */}
                        <span className="cart-weight-unit" style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 16px', minWidth: '48px',
                          color: 'var(--text-primary)',
                          fontSize: '30px', fontWeight: 600,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}>
                          {saleUnit}
                        </span>
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

                  <div className="cart-item-discount">
                    <label className="cart-discount-toggle" htmlFor={discountInputId}>
                      <input
                        id={discountInputId}
                        type="checkbox"
                        checked={discountChecked}
                        onChange={(e) => toggleDiscount(item, e.target.checked)}
                      />
                      {canApplyDiscount ? 'Aplicar descuento' : 'Solicitar descuento'}
                    </label>

                    {discountChecked && (
                      discountSettings.mode === 'fixed' ? (
                        <div className="cart-discount-presets" role="group" aria-label={`Descuento para ${item.name}`}>
                          {discountSettings.presets.map(preset => (
                            <button
                              key={preset}
                              type="button"
                              className={`cart-discount-chip ${discountPercent === preset ? 'active' : ''}`}
                              aria-pressed={discountPercent === preset}
                              onClick={() => setCartDiscount(item.id, discountPercent === preset ? 0 : preset)}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="cart-discount-free">
                          <input
                            type="number"
                            className="form-input cart-discount-input"
                            min="0"
                            max="100"
                            step="0.5"
                            inputMode="decimal"
                            aria-label={`Porcentaje de descuento para ${item.name}`}
                            placeholder="0"
                            value={discountDrafts[item.id] ?? (discountPercent > 0 ? String(discountPercent) : '')}
                            onChange={(e) => {
                              setDiscountDrafts(prev => ({ ...prev, [item.id]: e.target.value }))
                              setCartDiscount(item.id, e.target.value)
                            }}
                            onBlur={() => setDiscountDrafts(prev => ({
                              ...prev,
                              [item.id]: discountPercent > 0 ? String(discountPercent) : ''
                            }))}
                          />
                          <span>%</span>
                        </div>
                      )
                    )}

                    {discountPercent > 0 && !canApplyDiscount && (
                      <span className="cart-discount-pending">Pendiente de autorización</span>
                    )}
                  </div>

                  {canSeeCosts && isBelowCost(item) && (
                    <div className="discount-below-cost" role="alert">
                      <AlertTriangle size={16} />
                      Con este descuento vendes por debajo del costo
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
 
        <div className="cart-footer">
          {cartDiscountTotal > 0 && (
            <div className="cart-discount-summary">
              <span>Descuentos</span>
              <span>-${cartDiscountTotal.toLocaleString()}</span>
            </div>
          )}
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
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="digital">Nequi/Daviplata</option>
                  <option value="credit">Credito</option>
                </select>
              </div>
              {paymentMethod !== 'credit' && (
                <div className="form-group">
                  <label className="form-label">Monto Recibido</label>
                  <input
                    type="number"
                    inputMode="numeric"
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

          {lastReceipt && !showPayment && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setShowReceipt(true)}
            >
              <Receipt size={16} />
              Recibo de la última venta (N° {lastReceipt.ticketNumber})
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

      {pendingDiscountAuth && (
        <DiscountAuthorizationModal
          cart={cart}
          onClose={() => setPendingDiscountAuth(null)}
          onAuthorized={(token) => {
            const { paymentMethod: method, amountReceived } = pendingDiscountAuth
            setPendingDiscountAuth(null)
            completeSale(method, amountReceived, token)
          }}
        />
      )}

      {showReceipt && lastReceipt && (
        <SaleReceiptModal receipt={lastReceipt} onClose={() => setShowReceipt(false)} />
      )}

      {lastCreditSale && (
        <CreditSmsNotifyModal
          title="Fiado registrado"
          customer={lastCreditSale.customer}
          amountLabel="Esta compra"
          amount={lastCreditSale.total}
          balance={lastCreditSale.balance}
          target={{ type: 'sale', saleId: lastCreditSale.saleId }}
          onClose={() => setLastCreditSale(null)}
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