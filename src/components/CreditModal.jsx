import { useState, useEffect } from 'react'
import { X, DollarSign, User, ShoppingCart, History, CreditCard, AlertCircle } from 'lucide-react'
import { customersAPI, ApiNormalizers } from '../api/config'

function CreditModal({ customers, onClose, onUpdateCredit }) {
  const [customersWithCredit, setCustomersWithCredit] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [customerDetails, setCustomerDetails] = useState(null)
  const [error, setError] = useState(null)

  // Cargar clientes con crédito al abrir el modal
  useEffect(() => {
    loadCustomersWithCredit()
  }, [])

  const loadCustomersWithCredit = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await customersAPI.getWithCredit()
      // normalizeList ya maneja body.data || body y busca claves comunes
      const rawList = ApiNormalizers.normalizeList(response, ['customers'])
      
      // Normalizar cada objeto cliente para asegurar que tenga credit_balance
      const list = rawList.map(c => ({
        ...c,
        credit_balance: c.credit_balance ?? c.total_credit ?? c.balance ?? 0
      }))
      
      setCustomersWithCredit(list)

    } catch (err) {
      console.error('Error cargando clientes con crédito:', err)
      setError('Error al cargar los clientes con crédito')
      // Fallback: filtrar de la lista de clientes
      const withCredit = customers.filter(c => (c.credit_balance || 0) > 0)
      setCustomersWithCredit(withCredit)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerDetails = async (customerId) => {
    try {
      const [balanceRes, salesRes] = await Promise.all([
        customersAPI.getBalance(customerId),
        customersAPI.getCreditSales(customerId)
      ])
      
      const rawBalance = balanceRes.balance || balanceRes.data || balanceRes
      const creditVal = rawBalance.credit_balance ?? rawBalance.total_credit ?? rawBalance.balance?.credit_balance ?? 0
      const limitVal = rawBalance.credit_limit ?? rawBalance.balance?.credit_limit ?? 0
      
      const normalizedBalance = {
        credit_balance: creditVal,
        total_credit: creditVal, // Para compatibilidad con JSX que usa total_credit
        credit_limit: limitVal,
        available_credit: rawBalance.available_credit ?? 0
      }
      
      // Asegurar que available_credit tenga valor si no vino del backend
      if (normalizedBalance.available_credit === 0 && (normalizedBalance.credit_limit > 0)) {
        normalizedBalance.available_credit = normalizedBalance.credit_limit - normalizedBalance.credit_balance
      }

      setCustomerDetails({
        balance: normalizedBalance,
        sales: ApiNormalizers.normalizeList(salesRes, ['sales'])
      })
    } catch (err) {
      console.error('Error cargando detalles del cliente:', err)
      // Fallback: buscar en la lista local
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        setCustomerDetails({
          balance: { 
            total_credit: customer.credit_balance || 0,
            credit_limit: customer.credit_limit || 0,
            available_credit: (customer.credit_limit || 0) - (customer.credit_balance || 0)
          },
          sales: []
        })
      }
    }
  }

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer)
    await loadCustomerDetails(customer.id)
  }

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      alert('Ingrese un monto válido')
      return
    }

    if (!selectedCustomer) {
      alert('Seleccione un cliente')
      return
    }

    try {
      await onUpdateCredit(selectedCustomer.id, amount, paymentNote)
      setPaymentAmount('')
      setPaymentNote('')
      await loadCustomerDetails(selectedCustomer.id)
      await loadCustomersWithCredit()
    } catch (err) {
      console.error('Error procesando pago:', err)
    }
  }

  const handlePayAll = async () => {
    if (!selectedCustomer || !customerDetails) return
    
    const balance = customerDetails.balance
    const totalDebt = balance?.credit_balance ?? balance?.total_credit ?? balance?.balance?.credit_balance ?? 0
    if (totalDebt <= 0) {
      alert('El cliente no tiene deuda pendiente')
      return
    }

    setPaymentAmount(totalDebt.toString())
    await handlePayment()
  }

  const totalDebt = customersWithCredit.reduce((sum, c) => sum + (c.credit_balance || 0), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(255, 193, 7, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="modal-title">Cuentas por Cobrar</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Gestión de créditos y pagos pendientes
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p>Cargando clientes...</p>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <AlertCircle size={48} color="var(--danger)" />
              <h4>Error</h4>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={loadCustomersWithCredit} style={{ marginTop: '16px' }}>
                Reintentar
              </button>
            </div>
          ) : customersWithCredit.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <DollarSign size={48} style={{ opacity: 0.5 }} />
              <h4>No hay cuentas por cobrar</h4>
              <p>No hay clientes con deudas pendientes</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
              {/* Lista de clientes */}
              <div>
                {/* Resumen */}
                <div style={{ 
                  background: 'var(--surface)', 
                  padding: '16px', 
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Total por Cobrar
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent)' }}>
                    ${totalDebt.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {customersWithCredit.length} cliente{customersWithCredit.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Lista */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customersWithCredit.map(customer => (
                    <div 
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      style={{ 
                        padding: '16px',
                        background: selectedCustomer?.id === customer.id ? 'rgba(233, 69, 96, 0.1)' : 'var(--surface)',
                        borderRadius: '12px',
                        border: `1px solid ${selectedCustomer?.id === customer.id ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--bg-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <User size={20} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{customer.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {customer.phone || 'Sin teléfono'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>
                            ${(customer.credit_balance || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Deuda pendiente
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detalle del cliente seleccionado */}
              <div>
                {selectedCustomer ? (
                  <div>
                    {/* Info del cliente */}
                    <div style={{ 
                      background: 'var(--surface)', 
                      padding: '20px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0' }}>{selectedCustomer.name}</h4>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {selectedCustomer.email || 'Sin email'} • {selectedCustomer.phone || 'Sin teléfono'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Límite de Crédito</div>
                          <div style={{ fontSize: '16px', fontWeight: 600 }}>
                            ${(selectedCustomer.credit_limit || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {customerDetails && (
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '12px',
                          padding: '16px',
                          background: 'var(--bg-primary)',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Deuda Total</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>
                              ${(customerDetails.balance?.total_credit || 0).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Crédito Disponible</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)' }}>
                              ${(customerDetails.balance?.available_credit || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Formulario de pago */}
                    <div style={{ 
                      background: 'var(--surface)', 
                      padding: '20px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{ margin: '0 0 16px 0' }}>Registrar Pago</h5>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Monto a pagar"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={handlePayment}
                          disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                        >
                          <DollarSign size={16} />
                          Pagar
                        </button>
                        <button
                          className="btn btn-success"
                          onClick={handlePayAll}
                          disabled={!customerDetails?.balance?.total_credit}
                        >
                          Pagar Todo
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nota (opcional)"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                      />
                    </div>

                    {/* Historial de ventas a crédito */}
                    {customerDetails?.sales && customerDetails.sales.length > 0 && (
                      <div style={{ 
                        background: 'var(--surface)', 
                        padding: '20px', 
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                      }}>
                        <h5 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <History size={18} />
                          Historial de Compras a Crédito
                        </h5>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {customerDetails.sales.map((sale, idx) => (
                            <div key={sale.id || idx} style={{ 
                              padding: '12px',
                              background: 'var(--bg-primary)',
                              borderRadius: '8px',
                              marginBottom: '8px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                                  Venta #{sale.ticket_number || sale.id?.slice(-6)}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {new Date(sale.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                {(sale.items || []).map(item => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.product_name} x{item.quantity}</span>
                                    <span>${(item.subtotal || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                paddingTop: '8px',
                                borderTop: '1px dashed var(--border)'
                              }}>
                                <span style={{ fontSize: '13px' }}>Total: ${(sale.total || 0).toLocaleString()}</span>
                                <span style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 600,
                                  color: (sale.credit_remaining || 0) > 0 ? 'var(--accent)' : 'var(--success)'
                                }}>
                                  {(sale.credit_remaining || 0) > 0 ? `Pendiente: $${sale.credit_remaining.toLocaleString()}` : 'Pagado'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '60px 20px' }}>
                    <User size={48} style={{ opacity: 0.3 }} />
                    <h4>Seleccione un cliente</h4>
                    <p>Haga clic en un cliente de la lista para ver sus detalles y registrar pagos</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreditModal
