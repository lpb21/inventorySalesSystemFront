import { useState } from 'react'
import { X, Save, Package, Plus, Trash2, Scissors, ArrowRight } from 'lucide-react'
 
/**
 * TransformModal — Despiece / transformación de inventario.
 * Descuenta 1 producto origen e incrementa varios productos destino (cortes).
 * Merma libre: la suma de destinos puede ser menor al origen.
 */
function TransformModal({ products, onSave, onClose }) {
  // Origen
  const [sourceId, setSourceId] = useState('')
  const [sourceQty, setSourceQty] = useState('')
  const [sourceSearch, setSourceSearch] = useState('')
  const [showSourceList, setShowSourceList] = useState(false)
 
  // Destinos: lista dinámica de { product_id, quantity, search }
  const [targets, setTargets] = useState([
    { product_id: '', quantity: '', search: '', showList: false },
  ])
 
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
 
  const sourceProduct = products.find(p => p.id === sourceId)
 
  // Productos con stock, para el origen
  const sourceCandidates = products.filter(p =>
    p.name?.toLowerCase().includes(sourceSearch.toLowerCase()) && (p.stock || 0) > 0
  )
 
  const handleSelectSource = (product) => {
    setSourceId(product.id)
    setSourceSearch(product.name)
    setShowSourceList(false)
  }
 
  // --- Manejo de la lista de destinos ---
  const addTarget = () => {
    setTargets(prev => [...prev, { product_id: '', quantity: '', search: '', showList: false }])
  }
 
  const removeTarget = (index) => {
    setTargets(prev => prev.filter((_, i) => i !== index))
  }
 
  const updateTarget = (index, changes) => {
    setTargets(prev => prev.map((t, i) => (i === index ? { ...t, ...changes } : t)))
  }
 
  const selectTargetProduct = (index, product) => {
    updateTarget(index, {
      product_id: product.id,
      search: product.name,
      showList: false,
    })
  }
 
  // Suma de los destinos (para mostrar merma)
  const targetsSum = targets.reduce((sum, t) => sum + (parseFloat(t.quantity) || 0), 0)
 
  const handleSubmit = async (e) => {
    e.preventDefault()
 
    if (!sourceId) {
      alert('Seleccione el producto de origen')
      return
    }
    const sQty = parseFloat(sourceQty)
    if (!sQty || sQty <= 0) {
      alert('Ingrese una cantidad de origen válida')
      return
    }
    if (sourceProduct && sQty > sourceProduct.stock) {
      alert(`No hay suficiente stock. Disponible: ${sourceProduct.stock} ${sourceProduct.unit}`)
      return
    }
 
    // Validar destinos
    const validTargets = targets.filter(t => t.product_id && parseFloat(t.quantity) > 0)
    if (validTargets.length === 0) {
      alert('Agregue al menos un producto destino con su cantidad')
      return
    }
    if (validTargets.some(t => t.product_id === sourceId)) {
      alert('El producto origen no puede ser también un destino')
      return
    }
 
    setSaving(true)
    try {
      await onSave({
        source_product_id: sourceId,
        source_quantity: sQty,
        targets: validTargets.map(t => ({
          product_id: t.product_id,
          quantity: parseFloat(t.quantity),
        })),
        reason: reason || undefined,
      })
      onClose()
    } catch (error) {
      alert('Error al despiezar: ' + (error.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }
 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Scissors size={22} />
            </div>
            <div>
              <h3 className="modal-title">Despiezar Producto</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Convierte un producto en varios cortes (merma libre)
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
 
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
 
            {/* ─── ORIGEN ─── */}
            <div className="form-group">
              <label className="form-label">Producto de origen *</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '12px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1
                }}>
                  <Package size={16} />
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={sourceSearch}
                  onChange={(e) => {
                    setSourceSearch(e.target.value)
                    setSourceId('')
                    setShowSourceList(true)
                  }}
                  onFocus={() => setShowSourceList(true)}
                  placeholder="Buscar producto a despiezar..."
                  style={{ paddingLeft: '40px' }}
                  autoFocus
                />
                {showSourceList && sourceSearch && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', maxHeight: '200px', overflowY: 'auto',
                    zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {sourceCandidates.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No se encontraron productos con stock
                      </div>
                    ) : sourceCandidates.map(product => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectSource(product)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 500 }}>{product.name}</div>
                        <div style={{ color: 'var(--success)', fontWeight: 500, fontSize: '13px' }}>
                          Stock: {product.stock} {product.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
 
            {/* Cantidad de origen */}
            {sourceProduct && (
              <div className="form-group">
                <label className="form-label">Cantidad a despiezar *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={sourceQty}
                    onChange={(e) => setSourceQty(e.target.value)}
                    placeholder="0"
                    min="0.001" step="0.001"
                    max={sourceProduct.stock}
                    style={{ paddingRight: '60px' }}
                  />
                  <span style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '14px'
                  }}>
                    {sourceProduct.unit}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Disponible: {sourceProduct.stock} {sourceProduct.unit}
                </div>
              </div>
            )}
 
            {/* Separador visual */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', margin: '8px 0', color: 'var(--accent)'
            }}>
              <ArrowRight size={18} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Se obtiene</span>
            </div>
 
            {/* ─── DESTINOS ─── */}
            <div className="form-group">
              <label className="form-label">Cortes obtenidos *</label>
              {targets.map((target, index) => {
                const targetCandidates = products.filter(p =>
                  p.name?.toLowerCase().includes(target.search.toLowerCase()) && p.id !== sourceId
                )
                return (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 44px',
                    gap: '8px', marginBottom: '8px', alignItems: 'start'
                  }}>
                    {/* Buscador de producto destino */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={target.search}
                        onChange={(e) => updateTarget(index, {
                          search: e.target.value, product_id: '', showList: true
                        })}
                        onFocus={() => updateTarget(index, { showList: true })}
                        placeholder="Buscar corte..."
                      />
                      {target.showList && target.search && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: '8px', maxHeight: '160px', overflowY: 'auto',
                          zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                          {targetCandidates.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                              Sin resultados
                            </div>
                          ) : targetCandidates.map(product => (
                            <div
                              key={product.id}
                              onClick={() => selectTargetProduct(index, product)}
                              style={{
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid var(--border)', fontSize: '14px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontWeight: 500 }}>{product.name}</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>
                                ({product.unit})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
 
                    {/* Cantidad del destino */}
                    <input
                      type="number"
                      className="form-input"
                      value={target.quantity}
                      onChange={(e) => updateTarget(index, { quantity: e.target.value })}
                      placeholder="Peso"
                      min="0.001" step="0.001"
                      style={{ padding: '12px 10px' }}
                    />
 
                    {/* Botón quitar (solo si hay más de uno) */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeTarget(index)}
                      disabled={targets.length === 1}
                      style={{ padding: '10px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Quitar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
 
              {/* Agregar otro destino */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addTarget}
                style={{ marginTop: '4px' }}
              >
                <Plus size={16} /> Agregar corte
              </button>
            </div>
 
            {/* Resumen de merma */}
            {sourceProduct && sourceQty && targetsSum > 0 && (
              <div style={{
                padding: '10px 12px', background: 'var(--bg-secondary)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}>
                Origen: {sourceQty} {sourceProduct.unit} · Cortes: {targetsSum.toFixed(3)} kg
                <span style={{ color: 'var(--text-primary)' }}> · (la diferencia es merma)</span>
              </div>
            )}
 
            {/* Motivo */}
            <div className="form-group">
              <label className="form-label">Motivo (opcional)</label>
              <input
                type="text"
                className="form-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Despiece de pollo del día"
              />
            </div>
          </div>
 
          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !sourceId || !sourceQty}
            >
              {saving ? (
                <>
                  <span style={{
                    width: '18px', height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    display: 'inline-block', marginRight: '8px'
                  }} />
                  Despiezando...
                </>
              ) : (
                <>
                  <Save size={18} /> Despiezar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
 
export default TransformModal