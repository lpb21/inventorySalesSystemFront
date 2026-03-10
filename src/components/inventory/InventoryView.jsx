import { Plus, Edit, Trash2, Package2, Milk, Beef, Drumstick, ArrowDownCircle, Eye, EyeOff } from 'lucide-react'
import { can } from '../../utils/permissions'
import { useGlobalContext } from '../../context/GlobalContext'
import { useProducts } from '../../hooks/useProducts'
import { useState } from 'react'
import ProductModal from './ProductModal'
import CategoryModal from './CategoryModal'
import OutputModal from './OutputModal'
import { categoriesAPI } from '../../api/config'

function InventoryView({ searchTerm }) {
  const { 
    products, 
    categories, 
    currentUser, 
    addToast, 
    loadProducts, 
    loadCategories, 
    loadDashboardData 
  } = useGlobalContext()

  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showOutputModal, setShowOutputModal] = useState(false)
  const [showInactiveProducts, setShowInactiveProducts] = useState(false)
  const [showInactiveCategories, setShowInactiveCategories] = useState(false)

  const {
    saveProduct,
    toggleProductStatus,
    deleteProduct
  } = useProducts({ 
    addToast, 
    loadProducts, 
    editingProduct, 
    setEditingProduct, 
    setShowProductModal 
  })

  // Handlers locales para categorías (podrían moverse a useCategories hook si existiera, pero lo dejamos aquí por ahora)
  const handleSaveCategory = async (categoryData) => {
    try {
      if (categoryData.id) {
        await categoriesAPI.update(categoryData.id, {
          name: categoryData.name,
          description: categoryData.description || '',
          icon: categoryData.icon || 'package'
        })
        addToast('Categoría editada con éxito', 'success')
      } else {
        await categoriesAPI.create({
          name: categoryData.name,
          description: categoryData.description || '',
          icon: categoryData.icon || 'package'
        })
        addToast('Categoría creada', 'success')
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
      await loadCategories()
    } catch (error) {
      addToast(categoryData.id ? 'Error al editar categoría' : 'Error al crear categoría', 'error')
    }
  }

  const handleToggleCategoryStatus = async (category) => {
    try {
      if (category.is_active === false) {
        await categoriesAPI.reactivate(category.id)
        addToast('Categoría activada', 'success')
      } else {
        await categoriesAPI.deactivate(category.id)
        addToast('Categoría desactivada', 'success')
      }
      await loadCategories()
    } catch (error) {
      addToast('Error al cambiar estado de categoría', 'error')
    }
  }

  const handleRegisterOutput = async (outputData) => {
    try {
      const { inventoryAPI } = await import('../../api/config')
      await inventoryAPI.createOutput(outputData)
      addToast('Salida registrada exitosamente', 'success')
      await Promise.all([loadProducts(), loadDashboardData()])
      setShowOutputModal(false)
    } catch (error) {
      addToast('Error al registrar salida', 'error')
    }
  }

  const canEdit       = can(currentUser, 'canEditProducts')
  const canDelete     = can(currentUser, 'canDeleteProducts')
  const canManageCats = can(currentUser, 'canManageCategories')

  const processedProducts = showInactiveProducts ? products : products.filter(p => p.is_active !== false)

  const filteredProducts = processedProducts.filter(p => {
    const matchesSearch   = p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || p.category_id === selectedCategory || p.category?.name === selectedCategory
    return matchesSearch && matchesCategory
  })

  const allCategories = ['Todos', ...categories.map(c => c.name)]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="category-tabs" style={{ marginBottom: 0 }}>
            {allCategories.map(cat => (
              <button 
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
            {canManageCats && (
              <button className="category-tab" style={{ border: '1px dashed var(--border)' }} onClick={() => setShowCategoryModal(true)}>
                <Plus size={14} /> Nueva
              </button>
            )}
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setShowInactiveProducts(!showInactiveProducts)}
            title={showInactiveProducts ? "Ocultar inactivos" : "Mostrar inactivos"}
          >
            {showInactiveProducts ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canEdit && (
            <button className="btn btn-secondary" onClick={() => setShowOutputModal(true)}>
              <ArrowDownCircle size={18} />
              Registrar Salida
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true) }}>
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
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setEditingProduct(product); setShowProductModal(true) }}>
                    <Edit size={14} /> Editar
                  </button>
                )}
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(product.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modales locales */}
      {showProductModal && (
        <ProductModal 
          product={editingProduct}
          categories={categories}
          onSave={saveProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(null) }}
          onAddCategory={() => setShowCategoryModal(true)}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null) }}
        />
      )}

      {showOutputModal && (
        <OutputModal
          products={products}
          onSave={handleRegisterOutput}
          onClose={() => setShowOutputModal(false)}
        />
      )}
    </div>
  )
}

export default InventoryView