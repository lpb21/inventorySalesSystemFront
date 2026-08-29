import { useState, useEffect } from 'react'
import { X, Save, Package, Plus, Trash2, BookOpen, ArrowRight } from 'lucide-react'
import { useRecipeMutations, useRecipeDetail } from '../../hooks/queries/useRecipes'
 
/**
 * RecipeFormModal — Crear o editar una receta de despiece.
 * Si recibe `recipeId`, edita; si no, crea una nueva.
 */
function RecipeFormModal({ products, recipeId, onClose, addToast }) {
  const isEdit = !!recipeId
  const { create, update } = useRecipeMutations()
  const { data: recipeDetail } = useRecipeDetail(recipeId)
 
  // Cabecera
  const [name, setName] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [sourceSearch, setSourceSearch] = useState('')
  const [showSourceList, setShowSourceList] = useState(false)
 
  // Items (cortes sugeridos): { product_id, quantity, search, showList }
  const [items, setItems] = useState([
    { product_id: '', quantity: '', search: '', showList: false },
  ])
 
  const [saving, setSaving] = useState(false)
 
  // Si es edición, pre-llenar cuando llegue el detalle
  useEffect(() => {
    if (isEdit && recipeDetail) {
      setName(recipeDetail.name || '')
      setSourceId(recipeDetail.source_product_id || '')
      setSourceSearch(recipeDetail.sourceProduct?.name || '')
      if (Array.isArray(recipeDetail.items) && recipeDetail.items.length > 0) {
        setItems(recipeDetail.items.map(it => ({
          product_id: it.product_id,
          quantity: String(it.quantity),
          search: it.product?.name || '',
          showList: false,
        })))
      }
    }
  }, [isEdit, recipeDetail])
 
  const sourceCandidates = products.filter(p =>
    p.name?.toLowerCase().includes(sourceSearch.toLowerCase())
  )
 
  const handleSelectSource = (product) => {
    setSourceId(product.id)
    setSourceSearch(product.name)
    setShowSourceList(false)
  }
 
  // --- Manejo de items ---
  const addItem = () => {
    setItems(prev => [...prev, { product_id: '', quantity: '', search: '', showList: false }])
  }
  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }
  const updateItem = (index, changes) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...changes } : it)))
  }
  const selectItemProduct = (index, product) => {
    updateItem(index, { product_id: product.id, search: product.name, showList: false })
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
 
    if (!name.trim()) {
      addToast?.('Ingrese un nombre para la receta', 'error')
      return
    }
    if (!sourceId) {
      addToast?.('Seleccione el producto de origen', 'error')
      return
    }
    const validItems = items.filter(it => it.product_id && parseFloat(it.quantity) > 0)
    if (validItems.length === 0) {
      addToast?.('Agregue al menos un corte con su cantidad', 'error')
      return
    }
    if (validItems.some(it => it.product_id === sourceId)) {
      addToast?.('El producto origen no puede ser también un corte', 'error')
      return
    }
 
    const payload = {
      name: name.trim(),
      source_product_id: sourceId,
      items: validItems.map(it => ({
        product_id: it.product_id,
        quantity: parseFloat(it.quantity),
      })),
    }
 
    setSaving(true)
    try {
      if (isEdit) {
        await update.mutateAsync({ id: recipeId, data: payload })
        addToast?.('Receta actualizada', 'success')
      } else {
        await create.mutateAsync(payload)
        addToast?.('Receta creada', 'success')
      }
      onClose()
    } catch (error) {
      addToast?.('Error al guardar la receta: ' + (error.message || ''), 'error')
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
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="modal-title">{isEdit ? 'Editar Receta' : 'Nueva Receta'}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Plantilla de despiece con cortes sugeridos
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
 
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
 
            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">Nombre de la receta *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Despiece estándar de pollo"
                autoFocus
              />
            </div>
 
            {/* Origen */}
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
                  placeholder="Buscar producto..."
                  style={{ paddingLeft: '40px' }}
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
                        Sin resultados
                      </div>
                    ) : sourceCandidates.map(product => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectSource(product)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)'
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
            </div>
 
            {/* Separador */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', margin: '8px 0', color: 'var(--accent)'
            }}>
              <ArrowRight size={18} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Cortes sugeridos (por 1 unidad)</span>
            </div>
 
            {/* Items (cortes) */}
            <div className="form-group">
              {items.map((item, index) => {
                const itemCandidates = products.filter(p =>
                  p.name?.toLowerCase().includes(item.search.toLowerCase()) && p.id !== sourceId
                )
                return (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 44px',
                    gap: '8px', marginBottom: '8px', alignItems: 'start'
                  }}>
                    {/* Buscador de corte */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={item.search}
                        onChange={(e) => updateItem(index, {
                          search: e.target.value, product_id: '', showList: true
                        })}
                        onFocus={() => updateItem(index, { showList: true })}
                        placeholder="Buscar corte..."
                      />
                      {item.showList && item.search && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: '8px', maxHeight: '160px', overflowY: 'auto',
                          zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                          {itemCandidates.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                              Sin resultados
                            </div>
                          ) : itemCandidates.map(product => (
                            <div
                              key={product.id}
                              onClick={() => selectItemProduct(index, product)}
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
 
                    {/* Cantidad sugerida */}
                    <input
                      type="number"
                      className="form-input"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      placeholder="Cant."
                      min="0.001" step="0.001"
                      style={{ padding: '12px 10px' }}
                    />
 
                    {/* Quitar */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      style={{ padding: '10px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Quitar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
 
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addItem}
                style={{ marginTop: '4px' }}
              >
                <Plus size={16} /> Agregar corte
              </button>
            </div>
          </div>
 
          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : (
                <>
                  <Save size={18} /> {isEdit ? 'Actualizar' : 'Crear Receta'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
 
export default RecipeFormModal