import { ShoppingCart, DollarSign, Package, History, TrendingDown } from 'lucide-react'
import { can } from '../../utils/permissions'
import { reportsAPI } from '../../api/config'
import { useState, useEffect } from 'react'
import { useGlobalContext } from '../../context/GlobalContext'

function ReportsView() {
  const { sales, products, currentUser } = useGlobalContext()
  const [lowRotationProducts, setLowRotationProducts] = useState([])
  const [loadingLowRotation, setLoadingLowRotation] = useState(true)
  
  const showFullReports = can(currentUser, 'canViewFullReports')
  
  // Cargar productos con menor rotación
  useEffect(() => {
    const fetchLowRotation = async () => {
      try {
        const response = await reportsAPI.getLowRotation({ days: 30, limit: 10 })
        // El backend responde con { success: true, data: { products: [...] } }
        let productsArray = []
        if (response && response.success && response.data && response.data.products) {
          productsArray = response.data.products
        } else if (Array.isArray(response)) {
          productsArray = response
        } else if (response && typeof response === 'object') {
          productsArray = response.products || response.data || []
        }
        setLowRotationProducts(productsArray)
      } catch (error) {
        console.error('Error fetching low rotation products:', error)
        setLowRotationProducts([])
      } finally {
        setLoadingLowRotation(false)
      }
    }
    
    if (showFullReports) {
      fetchLowRotation()
    }
  }, [showFullReports])
  
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0)
  const totalSales   = sales.length

  const topProducts = products
    .map(p => ({
      ...p,
      totalSold: sales.reduce((sum, s) => {
        const item = s.items?.find(i => i.product_id === p.id)
        return sum + (item ? item.quantity : 0)
      }, 0)
    }))
    .filter(p => p.totalSold > 0)
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5)

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon primary">
            <ShoppingCart />
          </div>
          <div className="stat-value">{totalSales}</div>
          <div className="stat-label">Total de Ventas</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon success">
            <DollarSign />
          </div>
          <div className="stat-value">${totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Ingresos Totales</div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon info">
            <Package />
          </div>
          <div className="stat-value">{products.filter(p => p.is_active !== false).length}</div>
          <div className="stat-label">Productos Activos</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos Más Vendidos</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Vendidos</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(product => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category?.name || product.category}</td>
                    <td>{product.totalSold} {product.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Historial de Ventas Recientes</h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {sales.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <History size={48} />
                <h4>Sin ventas aún</h4>
                <p>Las ventas aparecerán aquí</p>
              </div>
            ) : (
              sales.slice(0, 10).map(sale => (
                <div 
                  key={sale.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Venta #{sale.ticket_number || sale.id?.slice(-6)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(sale.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      ${(sale.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Productos con Menor Rotación */}
      {showFullReports && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">
              <TrendingDown size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Productos con Menor Rotación (Últimos 30 días)
            </h3>
          </div>
          <div className="table-container">
            {loadingLowRotation ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="spinner"></div>
                <p>Cargando datos...</p>
              </div>
            ) : lowRotationProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <TrendingDown size={48} />
                <h4>Sin datos de rotación</h4>
                <p>No hay suficientes datos para determinar la rotación de productos</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock Actual</th>
                    <th>Vendidos</th>
                    <th>Última Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {lowRotationProducts.map(product => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.category?.name || product.category || '-'}</td>
                      <td>{product.stock} {product.unit}</td>
                      <td>
                        <span style={{ 
                          color: 'var(--danger)', 
                          fontWeight: 600 
                        }}>
                          {product.total_sold || 0} {product.unit}
                        </span>
                      </td>
                      <td>
                        {product.last_sale_date 
                          ? new Date(product.last_sale_date).toLocaleDateString()
                          : 'Sin ventas'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportsView
