import { ShoppingCart, DollarSign, Package, History, TrendingDown, TrendingUp, Crown, Lock, ChevronDown, ChevronRight } from 'lucide-react'
import { can } from '../../utils/permissions'
import { reportsAPI } from '../../api/config'
import { useState, useEffect } from 'react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useProducts } from '../../hooks/queries/useProducts'
import { useDashboardData } from '../../hooks/queries/useDashboard'
import ExportSalesModal from './ExportSalesModal'
import { PlanGuard } from '../shared/PlanGuard'

function ReportsView() {
  const { currentUser } = useGlobalContext()
  const { data: products = [] } = useProducts()
  const { data: dashboardData } = useDashboardData()
  const sales = dashboardData?.recentSales || []
  
  const [lowRotationProducts, setLowRotationProducts] = useState([])
  const [loadingLowRotation, setLoadingLowRotation] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [expandedSales, setExpandedSales] = useState(new Set())
  
  const showFullReports = can(currentUser, 'canViewFullReports')

  // Función para alternar expansión de ventas
  const toggleSaleExpansion = (saleId) => {
    setExpandedSales(prev => {
      const newSet = new Set(prev)
      if (newSet.has(saleId)) {
        newSet.delete(saleId)
      } else {
        newSet.add(saleId)
      }
      return newSet
    })
  }
  
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
  
  const totalRevenue = dashboardData?.metrics?.todaySales || 0
  const todayProfit = dashboardData?.metrics?.todayProfit || 0
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

        {showFullReports && (
          <PlanGuard
            requiredFeature="advancedReports"
            fallbackRender={() => (
              <div className="stat-card" style={{ border: '1px dashed var(--border)' }}>
                <div className="stat-icon" style={{ background: 'var(--surface)' }}>
                  <Crown />
                </div>
                <div className="stat-value" style={{ fontSize: '18px' }}>
                  <Lock size={18} style={{ verticalAlign: 'middle' }} />
                </div>
                <div className="stat-label">Ganancia de Hoy (Plan Pro+)</div>
              </div>
            )}
          >
            <div className="stat-card success">
              <div className="stat-icon success">
                <TrendingUp />
              </div>
              <div className="stat-value">${todayProfit.toLocaleString()}</div>
              <div className="stat-label">Ganancia de Hoy</div>
            </div>
          </PlanGuard>
        )}
        
        <div className="stat-card info">
          <div className="stat-icon info">
            <Package />
          </div>
          <div className="stat-value">{products.filter(p => p.is_active !== false).length}</div>
          <div className="stat-label">Productos Activos</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowExportModal(true)}
        >
          Exportar Ventas CSV
        </button>
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
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {sales.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <History size={48} />
                <h4>Sin ventas aún</h4>
                <p>Las ventas aparecerán aquí</p>
              </div>
            ) : (
              sales.slice(0, 10).map(sale => {
                const isExpanded = expandedSales.has(sale.id)
                return (
                  <div key={sale.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Header de la venta - clickeable */}
                    <div
                      onClick={() => toggleSaleExpansion(sale.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        cursor: 'pointer',
                        background: isExpanded ? 'var(--surface)' : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            Venta #{sale.ticket_number || sale.id?.slice(-6)}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(sale.created_at).toLocaleString()}
                            {sale.customer_name && (
                              <span style={{ marginLeft: '8px', color: 'var(--accent)' }}>
                                • {sale.customer_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          ${(sale.total || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {sale.payment_method === 'cash' && 'Efectivo'}
                          {sale.payment_method === 'card' && 'Tarjeta'}
                          {sale.payment_method === 'nequi' && 'Nequi'}
                          {sale.payment_method === 'credit' && 'Crédito'}
                        </div>
                      </div>
                    </div>

                    {/* Detalle expandible */}
                    {isExpanded && sale.items && sale.items.length > 0 && (
                      <div style={{
                        padding: '0 12px 12px 36px',
                        background: 'var(--surface)',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                          Productos vendidos:
                        </div>
                        {sale.items.map((item, index) => {
                          // Buscar el producto para obtener información adicional
                          const product = products.find(p => p.id === item.product_id)
                          return (
                            <div key={index} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 8px',
                              background: 'var(--background)',
                              borderRadius: '4px',
                              marginBottom: '4px',
                              fontSize: '13px'
                            }}>
                              <div>
                                <span style={{ fontWeight: 500 }}>
                                  {item.product_name || product?.name || `Producto ID: ${item.product_id}`}
                                </span>
                                <span style={{
                                  color: 'var(--text-secondary)',
                                  marginLeft: '8px',
                                  fontSize: '12px'
                                }}>
                                  x {item.quantity} {product?.unit || 'unidades'}
                                </span>
                              </div>
                              <div style={{ fontWeight: 500 }}>
                                ${((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}
                              </div>
                            </div>
                          )
                        })}

                        {/* Resumen de la venta */}
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          fontWeight: 600
                        }}>
                          {/* <span>Subtotal:</span>
                          <span>${(sale.subtotal || 0).toLocaleString()}</span> */}
                        </div>
                        {(sale.discount || 0) > 0 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: 'var(--accent)'
                          }}>
                            <span>Descuento:</span>
                            <span>-${(sale.discount || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--accent)',
                          paddingTop: '4px',
                          borderTop: '1px solid var(--border)',
                          marginTop: '4px'
                        }}>
                          <span>Total:</span>
                          <span>${(sale.total || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Mensaje cuando no hay items */}
                    {isExpanded && (!sale.items || sale.items.length === 0) && (
                      <div style={{
                        padding: '12px 36px',
                        background: 'var(--surface)',
                        borderTop: '1px solid var(--border)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic'
                      }}>
                        No hay detalle de productos disponible para esta venta
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Productos con Menor Rotación */}
      {showFullReports && (
        <PlanGuard
          requiredFeature="advancedReports"
          fallbackRender={() => (
            <div className="card" style={{ marginTop: '24px', border: '1px dashed var(--border)' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={18} />
                  Reporte de Rotación (Plan Pro+)
                </h3>
              </div>
              <div className="empty-state" style={{ padding: '40px' }}>
                <Lock size={36} />
                <h4>Funcionalidad Premium</h4>
                <p>Mejora tu plan para acceder a reportes avanzados de rotación.</p>
              </div>
            </div>
          )}
        >
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
        </PlanGuard>
      )}
      
      {showExportModal && (
        <ExportSalesModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}

export default ReportsView
