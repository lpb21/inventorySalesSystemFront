import { useState, useEffect } from 'react'
import { X, Save, Package, AlertTriangle, Trash2, RefreshCw } from 'lucide-react'

// Tipos de salida disponibles
const OUTPUT_TYPES = [
  { id: 'expired', label: 'Vencido', icon: '📅', color: '#f59e0b', description: 'Producto fuera de fecha' },
  { id: 'damaged', label: 'Dañado', icon: '💔', color: '#ef4444', description: 'Producto en mal estado' },
  { id: 'return', label: 'Devuelto al Proveedor', icon: '🔄', color: '#8b5cf6', description: 'Devolución para cambio' },
]

function OutputModal({ products, onSave, onClose }) {
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    output_type: 'expired',
    notes: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showProductList, setShowProductList] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (p.stock || 0) > 0
  )

  // Producto seleccionado
  const selectedProduct = products.find(p => p.id === formData.product_id)

  // Actualizar cantidad máxima según stock disponible
  useEffect(() => {
    if (selectedProduct && parseFloat(formData.quantity) > selectedProduct.stock) {
      setFormData(prev => ({ ...prev, quantity: String(selectedProduct.stock) }))
    }
  }, [selectedProduct])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.product_id) {
      alert('Por favor seleccione un producto')
      return
    }
    
    const quantity = parseFloat(formData.quantity)
    if (!quantity || quantity <= 0) {
      alert('Por favor ingrese una cantidad válida')
      return
    }
    
    if (selectedProduct && quantity > selectedProduct.stock) {
      alert('La cantidad no puede exceder el stock disponible')
      return
    }

    setSaving(true)
    try {
      await onSave({
        product_id: formData.product_id,
        quantity: quantity,
        output_type: formData.output_type,
        notes: formData.notes
      })
      onClose()
    } catch (error) {
      alert('Error al registrar la salida: ' + (error.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const handleProductSelect = (product) => {
    setFormData(prev => ({
      ...prev,
      product_id: product.id,
      quantity: String(product.stock > 0 ? product.stock : 1)
    }))
    setSearchTerm(product.name)
    setShowProductList(false)
  }

  const outputTypeInfo = OUTPUT_TYPES.find(t => t.id === formData.output_type)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
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
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="modal-title">Registrar Salida</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Productos vencidos, dañados o devueltos
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Selector de producto */}
            <div className="form-group">
              <label className="form-label">Producto *</label>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-secondary)',
                  zIndex: 1
                }}>
                  <Package size={16} />
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setFormData(prev => ({ ...prev, product_id: '' }))
                    setShowProductList(true)
                  }}
                  onFocus={() => setShowProductList(true)}
                  placeholder="Buscar producto..."
                  style={{ paddingLeft: '40px' }}
                  autoFocus
                />
                
                {/* Lista de productos */}
                {showProductList && searchTerm && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {filteredProducts.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No se encontraron productos
                      </div>
                    ) : (
                      filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{product.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {product.category?.name || 'Sin categoría'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--success)', fontWeight: 500 }}>
                              Stock: {product.stock} {product.unit}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {/* Info del producto seleccionado */}
              {selectedProduct && (
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Stock disponible: {selectedProduct.stock} {selectedProduct.unit}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: (selectedProduct.stock || 0) <= (selectedProduct.min_stock || 0) ? 'var(--danger)' : 'var(--success)'
                  }}>
                    {selectedProduct.stock}
                    <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '4px' }}>
                      {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div className="form-group">
              <label className="form-label">Cantidad *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  max={selectedProduct?.stock || undefined}
                  style={{ paddingRight: '60px' }}
                />
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  {selectedProduct?.unit || 'und'}
                </span>
              </div>
              {selectedProduct && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => setFormData(prev => ({ ...prev, quantity: String(selectedProduct.stock) }))}
                >
                  Usar todo el stock ({selectedProduct.stock} {selectedProduct.unit})
                </button>
              )}
            </div>

            {/* Tipo de salida */}
            <div className="form-group">
              <label className="form-label">Tipo de Salida *</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {OUTPUT_TYPES.map(type => (
                  <div
                    key={type.id}
                    onClick={() => setFormData(prev => ({ ...prev, output_type: type.id }))}
                    style={{
                      flex: '1 1 calc(33.333% - 8px)',
                      minWidth: '120px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${formData.output_type === type.id ? type.color : 'var(--border)'}`,
                      background: formData.output_type === type.id ? `${type.color}20` : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{type.icon}</div>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{type.label}</div>
                  </div>
                ))}
              </div>
              {outputTypeInfo && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: `${outputTypeInfo.color}15`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: outputTypeInfo.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={14} />
                  {outputTypeInfo.description}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Producto vencido por fecha de elaboración, dañado en transporte, etc."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || !formData.product_id || !formData.quantity}
            >
              {saving ? (
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
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Registrar Salida
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OutputModal

