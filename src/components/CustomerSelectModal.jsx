import { useState } from 'react'
import { X, User, Search, Check, AlertCircle } from 'lucide-react'

function CustomerSelectModal({ customers, onClose, onSelectCustomer }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar clientes por búsqueda
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectCustomer = (customer) => {
    onSelectCustomer(customer)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <User size={24} />
            </div>
            <div>
              <h3 className="modal-title">Seleccionar Cliente</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Seleccione el cliente para la venta a crédito
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Buscador */}
          <div className="form-group" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente por nombre, teléfono o email..."
              style={{ paddingLeft: '44px' }}
              autoFocus
            />
          </div>

          {/* Mensaje informativo */}
          {customers.length === 0 && (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(255, 193, 7, 0.1)', 
              borderRadius: '8px',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={20} color="var(--warning)" />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                No hay clientes registrados. Cree clientes desde Configuración → Gestión de Clientes.
              </div>
            </div>
          )}

          {/* Lista de clientes */}
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {filteredCustomers.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <User size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    style={{
                      padding: '16px',
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.background = 'rgba(233, 69, 96, 0.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--surface)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={22} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{customer.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {customer.phone && <span>📞 {customer.phone}</span>}
                          {customer.phone && customer.email && <span style={{ margin: '0 8px' }}>•</span>}
                          {customer.email && <span>✉️ {customer.email}</span>}
                          {!customer.phone && !customer.email && <span>Sin contacto</span>}
                        </div>
                        {customer.credit_balance > 0 && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: 'var(--accent)', 
                            marginTop: '4px',
                            fontWeight: 500
                          }}>
                            Deuda: ${customer.credit_balance.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <Check size={18} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerSelectModal
