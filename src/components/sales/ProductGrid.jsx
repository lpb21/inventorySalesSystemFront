import { Drumstick, Milk, Beef, Package } from 'lucide-react'
import {
  isWeightProduct,
  getWeightSaleUnit,
  getPriceForSaleUnit,
  formatQuantity,
} from '../../utils/measurements'
 
/**
 * ProductCard — Una tarjeta de producto en el POS.
 * Muestra imagen/ícono, nombre, precio (ajustado por unidad de venta) y stock.
 */
function ProductCard({ product, onAdd }) {
  const saleUnit = isWeightProduct(product) ? getWeightSaleUnit(product) : product.unit
  const visiblePrice = isWeightProduct(product)
    ? getPriceForSaleUnit(product, saleUnit)
    : (product.price || 0)
 
  const isLowStock = (product.stock || 0) <= (product.min_stock || product.minStock || 0)
 
  return (
    <div
      className="product-card"
      onClick={() => onAdd(product)}
      style={{ cursor: 'pointer' }}
    >
      <div className="product-image" style={{ height: '100px' }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
          />
        ) : (
          <>
            {product.category?.name === 'Pollo' && <Drumstick size={36} />}
            {product.category?.name === 'Quesos' && <Milk size={36} />}
            {(product.category?.name === 'Carnes Frías' || product.category?.name === 'Embutidos') && <Beef size={36} />}
            {!['Pollo', 'Quesos', 'Carnes Frías', 'Embutidos'].includes(product.category?.name) && <Package size={36} />}
          </>
        )}
      </div>
 
      <div className="product-name" style={{ fontSize: '14px' }}>{product.name}</div>
      <div className="product-price" style={{ fontSize: '18px' }}>
        ${visiblePrice.toLocaleString()}
        {isWeightProduct(product) ? ` / ${saleUnit}` : ''}
      </div>
      <div style={{ fontSize: '12px', color: isLowStock ? 'var(--danger)' : 'var(--text-secondary)' }}>
        Stock: {formatQuantity(product.stock)} {product.unit}
      </div>
    </div>
  )
}
 
/**
 * ProductGrid — La grilla de productos del POS.
 * Recibe la lista ya filtrada y la función para agregar al carrito.
 */
function ProductGrid({ products, onAddToCart }) {
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
      ))}
    </div>
  )
}
 
export default ProductGrid