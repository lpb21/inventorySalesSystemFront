import { useState, useEffect } from 'react'
import { DollarSign, User, History, CreditCard, AlertCircle, Search, Filter } from 'lucide-react'
import { customersAPI } from '../api/config'

function CreditAccountsView({ onUpdateCredit }) {
  const [customersWithCredit, setCustomersWithCredit] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [customerDetails, setCustomerDetails] = useState(null)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Cargar clientes con crédito al montar el componente
  useEffect(() => {
    loadCustomersWithCredit()
  }, [])

  const loadCustomersWithCredit = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await customersAPI.getWithCredit()
      const list = response.data?.customers || response.data || response
      setCustomersWithCredit(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Error cargando clientes con crédito:', err)
      setError('Error al cargar los clientes con crédito')
      setCustomersWithCredit([])
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
      
      setCustomerDetails({
        balance: balanceRes.data || balanceRes,
        sales: salesRes.data || salesRes
      })
    } catch (err) {
      console.error('Error cargando detalles del cliente:', err)
      // Fallback: buscar en la lista local
      const customer = customersWithCredit.find(c => c.id === customerId)
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
    setShowPaymentForm(false)
    setPaymentAmount('')
    setPaymentNote('')
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
      setShowPaymentForm(false)
      await loadCustomerDetails(selectedCustomer.id)
      await loadCustomersWithCredit()
    } catch (err) {
      console.error('Error procesando pago:', err)
    }
  }

  const handlePayAll = async () => {
    if (!selectedCustomer || !customerDetails) return
    
    const totalDebt = customerDetails.balance?.credit_balance ?? customerDetails.balance?.total_credit ?? 0
    if (totalDebt <= 0) {
      alert('El cliente no tiene deuda pendiente')
      return
    }

    setPaymentAmount(totalDebt.toString())
    // No llamamos handlePayment automáticamente para que el usuario confirme
  }


  const filteredCustomers = customersWithCredit.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.document?.includes(searchTerm)
  )

  const totalDebt = customersWithCredit.reduce((sum, c) => sum + (c.credit_balance || 0), 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        padding: '0 0 16px 0',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(255, 193, 7, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--warning)'
          }}>
            <CreditCard size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Cuentas por Cobrar</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Gestión de créditos y pagos pendientes
            </p>
          </div>
        </div>
        
        {/* Resumen General */}
        <div style={{ 
          background: 'var(--surface)', 
          padding: '16px 24px', 
          borderRadius: '12px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total por Cobrar</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent)' }}>
              ${totalDebt.toLocaleString()}
            </div>
          </div>
          <div style={{ 
            width: '1px', 
            height: '40px', 
            background: 'var(--border)' 
          }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Clientes</div>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>
              {customersWithCredit.length}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '4px solid var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 24px'
          }} />
          <p>Cargando clientes...</p>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AlertCircle size={64} color="var(--danger)" />
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={loadCustomersWithCredit} style={{ marginTop: '16px' }}>
            Reintentar
          </button>
        </div>
      ) : customersWithCredit.length === 0 ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <DollarSign size={64} style={{ opacity: 0.5 }} />
          <h3>No hay cuentas por cobrar</h3>
          <p>No hay clientes con deudas pendientes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
          {/* Lista de clientes */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Buscador */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            {/* Lista scrollable */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              paddingRight: '8px'
            }}>
              {filteredCustomers.map(customer => (
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
          <div style={{ overflowY: 'auto', paddingRight: '8px' }}>
            {selectedCustomer ? (
              <div>
                {/* Info del cliente */}
                <div style={{ 
                  background: 'var(--surface)', 
                  padding: '24px', 
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0' }}>{selectedCustomer.name}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {selectedCustomer.email || 'Sin email'} • {selectedCustomer.phone || 'Sin teléfono'}
                      </p>
                      {selectedCustomer.document && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Documento: {selectedCustomer.document}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Límite de Crédito</div>
                      <div style={{ fontSize: '18px', fontWeight: 600 }}>
                        ${(selectedCustomer.credit_limit || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {customerDetails && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '16px',
                      padding: '20px',
                      background: 'var(--bg-primary)',
                      borderRadius: '10px'
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Deuda Total</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>
                          ${(customerDetails.balance?.credit_balance ?? customerDetails.balance?.total_credit ?? 0).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Crédito Disponible</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                          ${(customerDetails.balance?.available_credit ?? (customerDetails.balance?.credit_limit - customerDetails.balance?.credit_balance) ?? 0).toLocaleString()}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Formulario de pago */}
                <div style={{ 
                  background: 'var(--surface)', 
                  padding: '24px', 
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DollarSign size={20} />
                      Registrar Pago
                    </h4>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                    >
                      {showPaymentForm ? 'Cancelar' : 'Nuevo Pago'}
                    </button>
                  </div>

                  {showPaymentForm && (
                    <div>
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
                          className="btn btn-success"
                          onClick={handlePayAll}
                          disabled={!(customerDetails?.balance?.credit_balance || customerDetails?.balance?.total_credit)}
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
                        style={{ marginBottom: '12px' }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handlePayment}
                        disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                        style={{ width: '100%' }}
                      >
                        <DollarSign size={18} />
                        Confirmar Pago
                      </button>
                    </div>
                  )}
                </div>

                {/* Historial de ventas a crédito */}
                {customerDetails?.sales && customerDetails.sales.length > 0 && (
                  <div style={{ 
                    background: 'var(--surface)', 
                    padding: '24px', 
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={20} />
                      Historial de Compras a Crédito
                    </h4>
                    <div>
                      {customerDetails.sales.map((sale, idx) => (
                        <div key={sale.id || idx} style={{ 
                          padding: '16px',
                          background: 'var(--bg-primary)',
                          borderRadius: '10px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 600 }}>
                              Venta #{sale.ticket_number || sale.id?.slice(-6)}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {new Date(sale.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {(sale.items || []).map(item => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span>{item.product_name} x{item.quantity}</span>
                                <span>${(item.subtotal || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '1px dashed var(--border)'
                          }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Total: ${(sale.total || 0).toLocaleString()}</span>
                            <span style={{ 
                              fontSize: '14px', 
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
              <div className="empty-state" style={{ padding: '80px 20px' }}>
                <User size={64} style={{ opacity: 0.3 }} />
                <h3>Seleccione un cliente</h3>
                <p>Haga clic en un cliente de la lista para ver sus detalles y registrar pagos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CreditAccountsView
