import { ShoppingCart, DollarSign, Package, History } from 'lucide-react'
import { can } from '../utils/permissions'

function ReportsView({ sales, products, currentUser }) {
  const showFullReports = can(currentUser, 'canViewFullReports')
  
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
    </div>
  )
}

export default ReportsView
