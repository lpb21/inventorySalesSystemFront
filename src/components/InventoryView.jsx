import { Plus, Edit, Trash2, Package2, Milk, Beef, Drumstick, ArrowDownCircle } from 'lucide-react'
import { can } from '../utils/permissions'

function InventoryView({ products, categories, selectedCategory, onCategoryChange, onAddProduct, onEditProduct, onDeleteProduct, searchTerm, onAddCategory, onRegisterOutput, currentUser }) {
  const canEdit       = can(currentUser, 'canEditProducts')
  const canDelete     = can(currentUser, 'canDeleteProducts')
  const canManageCats = can(currentUser, 'canManageCategories')

  const filteredProducts = products.filter(p => {
    const matchesSearch   = p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || p.category_id === selectedCategory || p.category?.name === selectedCategory
    return matchesSearch && matchesCategory
  })

  const allCategories = ['Todos', ...categories.map(c => c.name)]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="category-tabs">
          {allCategories.map(cat => (
            <button 
              key={cat}
              className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
          {canManageCats && (
            <button className="category-tab" style={{ border: '1px dashed var(--border)' }} onClick={onAddCategory}>
              <Plus size={14} /> Nueva
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canEdit && onRegisterOutput && (
            <button className="btn btn-secondary" onClick={onRegisterOutput}>
              <ArrowDownCircle size={18} />
              Registrar Salida
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={onAddProduct}>
              <Plus size={18} />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                />
              ) : (
                <>
                  {product.category?.name === 'Pollo' && <Drumstick size={48} />}
                  {product.category?.name === 'Quesos' && <Milk size={48} />}
                  {(product.category?.name === 'Carnes Frías' || product.category?.name === 'Embutidos') && <Beef size={48} />}
                  {!['Pollo', 'Quesos', 'Carnes Frías', 'Embutidos'].includes(product.category?.name) && <Package2 size={48} />}
                </>
              )}
            </div>
            <div className="product-name">{product.name}</div>
            <div className="product-category">{product.category?.name || product.category}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="product-price">${(product.price || 0).toLocaleString()}/{product.unit}</div>
              <div className={`product-stock ${(product.stock || 0) <= (product.min_stock || product.minStock || 0) ? 'stock-low' : 'stock-ok'}`}>
                Stock: {product.stock} {product.unit}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {canEdit && (
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onEditProduct(product)}>
                    <Edit size={14} /> Editar
                  </button>
                )}
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeleteProduct(product.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InventoryView