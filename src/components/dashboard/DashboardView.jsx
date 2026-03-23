import { useState } from 'react'
import {
  TrendingUp, AlertTriangle, Package,
  ShoppingCart, History, ChevronRight, BarChart3, Calendar
} from 'lucide-react'
import { getExpirationStatus } from '../../utils/expiration'
import { can } from '../../utils/permissions'
import { useGlobalContext } from '../../context/GlobalContext'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../../hooks/queries/useProducts'
import { useDashboardData } from '../../hooks/queries/useDashboard'
import { useExpiringSoonProducts, useExpiredProducts } from '../../hooks/queries/useExpiration'

function DashboardView() {
  const [expandedSaleId, setExpandedSaleId] = useState(null)
  const navigate = useNavigate()
  const { currentUser } = useGlobalContext()

  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboardData()
  const { data: expiringSoon = [], isLoading: loadingExpiringSoon } = useExpiringSoonProducts()
  const { data: expired = [], isLoading: loadingExpired } = useExpiredProducts()

  const todaySales = dashboardData?.metrics?.todaySales || 0
  const sales = dashboardData?.recentSales || []

  const loading = loadingProducts || loadingDashboard

  const totalProducts = products.length
  const localLowStock = products.filter(p => (p.stock || 0) <= (p.min_stock || p.minStock || 0)).length
  // Usar datos del backend: productos próximos a vencer + ya vencidos
  const totalExpirationIssues = (expiringSoon.length || 0) + (expired.length || 0)

  const showSalesCards = can(currentUser, 'canViewFullReports')
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (

    <div>
      <div className="stats-grid">
        {showSalesCards ? (
          <>
            {/* <div className="stat-card primary">
              <div className="stat-icon primary">
                <TrendingUp />
              </div>
              <div className="stat-value">${(todaySales || 0).toLocaleString()}</div>
              <div className="stat-label">Ventas de Hoy</div>
            </div> */}
          </>
        ) : null}
        
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
          <div className="stat-value">{totalExpirationIssues}</div>
          <div className="stat-label">Vencidos/Próximos a Vencer</div>
        </div>
      </div>


      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos con Stock Bajo</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/inventory')}>
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
            <h3 className="card-title">Productos con Problemas de Vencimiento</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/inventory')}>
              Ver Todos
            </button>
          </div>
          {loadingExpiringSoon || loadingExpired ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : totalExpirationIssues === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Calendar size={48} />
              <h4>Sin alertas</h4>
              <p>No hay productos vencidos ni próximos a vencer</p>
            </div>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {/* Mostrar primero los vencidos */}
              {expired.slice(0, 3).map(product => (
                <div key={product.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderBottom: '1px solid var(--border)',
                  background: 'rgba(239, 68, 68, 0.05)' // Fondo rojo muy sutil
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {product.category?.name || product.category} • Stock: {product.stock || 0}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--danger)',
                      fontSize: '12px'
                    }}>
                      ⚠️ VENCIDO
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Venció: {new Date(product.expiry_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Luego mostrar los próximos a vencer */}
              {expiringSoon.slice(0, 5 - expired.slice(0, 3).length).map(product => {
                const status = getExpirationStatus(product)
                const statusColors = {
                  today: 'var(--danger)',
                  tomorrow: 'var(--danger)',
                  critical: 'var(--warning)',
                  warning: '#ffc107',
                  normal: 'var(--success)',
                  expired: 'var(--danger)'
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
                        {product.category?.name || product.category} • Stock: {product.stock || 0}
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

        {showSalesCards && (
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
                  <div key={sale.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <div 
                      onClick={() => setExpandedSaleId(prev => prev === sale.id ? null : sale.id)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px',
                        cursor: 'pointer',
                        background: expandedSaleId === sale.id ? 'var(--bg-primary)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>Venta #{sale.ticket_number || sale.id?.slice(-6)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(sale.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          ${(sale.total || 0).toLocaleString()}
                        </div>
                        <ChevronRight 
                          size={16} 
                          style={{ 
                            color: 'var(--text-secondary)',
                            transform: expandedSaleId === sale.id ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                      </div>
                    </div>
                    
                    {expandedSaleId === sale.id && (
                      <div style={{ 
                        padding: '12px', 
                        background: 'var(--bg-primary)'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                          Detalle de productos:
                        </div>
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((item, idx) => (
                            <div key={item.id || idx} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              fontSize: '13px',
                              marginBottom: '4px'
                            }}>
                              <span>{item.product?.name || item.product_name || item.name || 'Producto Desconocido'} (x{Number(item.quantity)})</span>
                              <span>${(item.subtotal || item.unit_price * item.quantity || 0).toLocaleString()}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            No hay detalle disponible
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="quick-actions" style={{ marginTop: '24px' }}>
        <div className="action-card" onClick={() => navigate('/sales')}>
          <div className="action-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>
            <ShoppingCart />
          </div>
          <div className="action-content">
            <h4>Nueva Venta</h4>
            <p>Iniciar punto de venta</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="action-card" onClick={() => navigate('/inventory')}>
          <div className="action-icon" style={{ background: 'rgba(0, 217, 165, 0.15)', color: 'var(--success)' }}>
            <Package />
          </div>
          <div className="action-content">
            <h4>Gestionar Inventario</h4>
            <p>Agregar o editar productos</p>
          </div>
          <ChevronRight style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        {can(currentUser, 'canViewFullReports') && (
          <div className="action-card" onClick={() => navigate('/reports')}>
            <div className="action-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <BarChart3 />
            </div>
            <div className="action-content">
              <h4>Ver Reportes</h4>
              <p>Estadísticas y análisis</p>
            </div>
            <ChevronRight style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardView