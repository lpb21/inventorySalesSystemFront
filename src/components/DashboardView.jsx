import {
  TrendingUp, AlertTriangle, DollarSign, Package,
  ShoppingCart, History, ChevronRight, BarChart3, Calendar
} from 'lucide-react'
import { getProductsNearingExpiration, getExpirationStatus } from '../utils/expiration'

function DashboardView({ products, sales, todaySales, todayProfit, lowStockProducts, onNavigate, loading }) {
  const totalProducts = products.length
  const localLowStock = products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0)).length
  const nearingExpiration = getProductsNearingExpiration(products, 7)
  
  return (

    <div>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon primary">
            <TrendingUp />
          </div>
          <div className="stat-value">${(todaySales || 0).toLocaleString()}</div>
          <div className="stat-label">Ventas de Hoy</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon success">
            <DollarSign />
          </div>
          <div className="stat-value">${(todayProfit || 0).toLocaleString()}</div>
          <div className="stat-label">Ganancia de Hoy</div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon warning">
            <Package />
          </div>
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-label">Productos Activos</div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon info">
            <AlertTriangle />
          </div>
          <div className="stat-value">{localLowStock}</div>
          <div className="stat-label">Stock Bajo</div>
        </div>
        
        <div className="stat-card danger">
          <div className="stat-icon danger">
            <Calendar />
          </div>
          <div className="stat-value">{nearingExpiration.length}</div>
          <div className="stat-label">Próximos a Vencer</div>
        </div>
      </div>


      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos con Stock Bajo</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('inventory')}>
              Ver Todos
            </button>
          </div>
          {localLowStock === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Package size={48} />
              <h4>Todo en orden</h4>
              <p>No hay productos con stock bajo</p>
            </div>
          ) : (
            <div>
              {products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0)).slice(0, 5).map(product => (
                <div key={product.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{product.category?.name || product.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{product.stock} {product.unit}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mín: {product.min_stock || product.minStock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos Próximos a Vencer</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('inventory')}>
              Ver Todos
            </button>
          </div>
          {nearingExpiration.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Calendar size={48} />
              <h4>Sin alertas</h4>
              <p>No hay productos próximos a vencer</p>
            </div>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {nearingExpiration.slice(0, 5).map(product => {
                const status = getExpirationStatus(product)
                const statusColors = {
                  today: 'var(--danger)',
                  tomorrow: 'var(--danger)',
                  critical: 'var(--warning)',
                  warning: '#ffc107',
                  normal: 'var(--success)'
                }
                return (
                  <div key={product.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {product.category?.name || product.category}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 600, 
                        color: statusColors[status.type] || 'var(--text-secondary)',
                        fontSize: '12px'
                      }}>
                        {status.message}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Vence: {new Date(product.expiry_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventas Recientes</h3>
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

      <div className="quick-actions" style={{ marginTop: '24px' }}>
        <div className="action-card" onClick={() => onNavigate('sales')}>
          <div className="action-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>
            <ShoppingCart />
          </div>
          <div className="action-content">
            <h4>Nueva Venta</h4>
            <p>Iniciar punto de venta (F2)</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="action-card" onClick={() => onNavigate('inventory')}>
          <div className="action-icon" style={{ background: 'rgba(0, 217, 165, 0.15)', color: 'var(--success)' }}>
            <Package />
          </div>
          <div className="action-content">
            <h4>Gestionar Inventario</h4>
            <p>Agregar o editar productos (F3)</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="action-card" onClick={() => onNavigate('reports')}>
          <div className="action-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <BarChart3 />
          </div>
          <div className="action-content">
            <h4>Ver Reportes</h4>
            <p>Estadísticas y análisis</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    </div>
  )
}

export default DashboardView
