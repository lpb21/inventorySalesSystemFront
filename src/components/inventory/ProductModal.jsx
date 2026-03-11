import { useState } from 'react'
import { X, Plus, Save } from 'lucide-react'

function ProductModal({ product, categories, suppliers = [], onSave, onClose, onAddCategory, onAddSupplier }) {
  const [formData, setFormData] = useState(product
    ? {
        ...product,
        price: product.price ?? '',
        cost: product.cost ?? '',
        stock: product.stock ?? '',
        min_stock: product.min_stock ?? '',
        description: product.description ?? '',
        barcode: product.barcode ?? '',
        expiry_date: product.expiry_date ?? '',
        supplier_id: product.supplier_id ?? ''
      }
    : {
        name: '',
        description: '',
        barcode: '',
        category_id: categories[0]?.id || '',
        supplier_id: '',
        price: '',
        cost: '',
        stock: '',
        min_stock: '',
        unit: 'kg',
        type: 'weight',
        is_active: true,
        expiry_date: ''
      })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      stock: parseFloat(formData.stock) || 0,
      min_stock: parseFloat(formData.min_stock) || 0,
      supplier_id: formData.supplier_id || null
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">DescripciÃ³n</label>
              <textarea
                className="form-input"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="DescripciÃ³n opcional del producto"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CÃ³digo de Barras</label>
              <input
                type="text"
                className="form-input"
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Ej: 7501234567890"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Vencimiento</label>
              <input
                type="date"
                className="form-input"
                value={formData.expiry_date}
                onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CategorÃ­a</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onAddCategory}
                  style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                >
                  <Plus size={16} /> Nueva
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Proveedor</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={formData.supplier_id}
                  onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
                {onAddSupplier && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onAddSupplier}
                    style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                  >
                    <Plus size={16} /> Nuevo
                  </button>
                )}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Precio de Venta</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Precio de Costo</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select
                  className="form-select"
                  value={formData.unit}
                  onChange={e => {
                    const newUnit = e.target.value
                    const newType = (newUnit === 'und' || newUnit === 'paq') ? 'unit' : 'weight'
                    setFormData({ ...formData, unit: newUnit, type: newType })
                  }}
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="lb">Libras (lb)</option>
                  <option value="und">Unidad</option>
                  <option value="paq">Paquete</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Producto</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.type === 'weight' ? 'Por Peso' : 'Por Unidad'}
                  disabled
                  style={{ background: 'var(--surface)' }}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  {formData.type === 'weight' ? `Stock Actual (${formData.unit})` : 'Stock Actual'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  step={formData.type === 'weight' ? '0.001' : '1'}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {formData.type === 'weight' ? `Stock MÃ­nimo (${formData.unit})` : 'Stock MÃ­nimo'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.min_stock}
                  onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                  placeholder="0"
                  step={formData.type === 'weight' ? '0.001' : '1'}
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductModal
