import { ShoppingCart, DollarSign, Package, History, TrendingDown, TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Receipt, Search, X } from 'lucide-react'
import { reportsAPI } from '../../api/config'
import { useState, useEffect } from 'react'
import { paymentMethodLabel } from '../../utils/paymentMethods'
import { useProducts } from '../../hooks/queries/useProducts'
import { useDashboardData } from '../../hooks/queries/useDashboard'
import { useSalesHistory } from '../../hooks/queries/useSales'
import ExportSalesModal from './ExportSalesModal'
import MonthlyReportTab from './MonthlyReportTab'
import SaleReceiptModal from '../sales/SaleReceiptModal'
import { useGlobalContext } from '../../context/GlobalContext'
import { can } from '../../utils/permissions'
import { buildReceiptData } from '../../utils/receipt'

function ReportsView() {
  const { data: products = [] } = useProducts()
  const { data: dashboardData } = useDashboardData()
  const sales = dashboardData?.recentSales || []
  
  const [lowRotationProducts, setLowRotationProducts] = useState([])
  const [loadingLowRotation, setLoadingLowRotation] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [expandedSales, setExpandedSales] = useState(new Set())
  const [activeTab, setActiveTab] = useState('general')
  const { currentUser } = useGlobalContext()
  // El recibo de ventas pasadas solo lo ve el administrador del negocio
  const canViewSaleReceipts = can(currentUser, 'canViewSaleReceipts')
  const [receipt, setReceipt] = useState(null)

  // Historial de ventas: paginado, con búsqueda por código y rango de fechas
  const [historyPage, setHistoryPage] = useState(1)
  // Lo que se escribe en los filtros no consulta al servidor: solo se envía
  // al pulsar "Buscar", para no disparar una petición por cada cambio.
  const EMPTY_HISTORY_FILTERS = { search: '', startDate: '', endDate: '' }
  const [historyDraft, setHistoryDraft] = useState(EMPTY_HISTORY_FILTERS)
  const [historyFilters, setHistoryFilters] = useState(EMPTY_HISTORY_FILTERS)

  const setDraftField = (field) => (e) => {
    const value = e.target.value
    setHistoryDraft(prev => ({ ...prev, [field]: value }))
  }

  const applyHistoryFilters = (e) => {
    e.preventDefault()
    setHistoryFilters({ ...historyDraft, search: historyDraft.search.trim() })
    setHistoryPage(1)
  }

  const {
    data: historyData,
    isLoading: loadingHistory,
    isFetching: fetchingHistory,
    isError: historyError,
  } = useSalesHistory({
    page: historyPage,
    limit: 10,
    ...historyFilters,
  })
  const historySales = historyData?.sales || []
  const historyPagination = historyData?.pagination || { page: 1, totalPages: 1, total: 0, hasNextPage: false, hasPrevPage: false }
  const hasHistoryFilters = Object.values(historyFilters).some(Boolean)
  const hasHistoryDraft = Object.values(historyDraft).some(Boolean)
  const historyDraftPending = Object.keys(historyDraft).some(k => historyDraft[k].trim() !== historyFilters[k])

  const clearHistoryFilters = () => {
    setHistoryDraft(EMPTY_HISTORY_FILTERS)
    setHistoryFilters(EMPTY_HISTORY_FILTERS)
    setHistoryPage(1)
  }

  const openReceipt = (sale) => {
    setReceipt(buildReceiptData({
      sale,
      cart: products, // aporta la unidad de cada producto
      tenant: currentUser?.tenant,
      cashierName: sale.user?.name,
      amountReceived: sale.amount_received,
    }))
  }
  

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
    
    fetchLowRotation()
  }, [])
  
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
      <div className="category-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`category-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`category-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Cierre Mensual
        </button>
      </div>

      {activeTab === 'monthly' ? (
        <MonthlyReportTab />
      ) : (
        <>
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

        <div className="stat-card success">
          <div className="stat-icon success">
            <TrendingUp />
          </div>
          <div className="stat-value">${todayProfit.toLocaleString()}</div>
          <div className="stat-label">Ganancia de Hoy</div>
        </div>
        
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
            <h3 className="card-title">Historial de Ventas</h3>
          </div>

          {/* Filtros: código de venta y rango de fechas */}
          <form
            onSubmit={applyHistoryFilters}
            style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', padding: '16px 20px 12px' }}
          >
            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <div style={{
                position: 'absolute', left: '10px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}>
                <Search size={16} />
              </div>
              <input
                type="text"
                className="form-input"
                aria-label="Buscar por código de venta"
                placeholder="Código de venta..."
                value={historyDraft.search}
                onChange={setDraftField('search')}
                style={{ paddingLeft: '34px' }}
              />
            </div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Desde
              <input
                type="date"
                className="form-input"
                value={historyDraft.startDate}
                max={historyDraft.endDate || undefined}
                onChange={setDraftField('startDate')}
              />
            </label>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Hasta
              <input
                type="date"
                className="form-input"
                value={historyDraft.endDate}
                min={historyDraft.startDate || undefined}
                onChange={setDraftField('endDate')}
              />
            </label>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!historyDraftPending}>
              <Search size={16} />
              Buscar
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={clearHistoryFilters}
              disabled={!hasHistoryFilters && !hasHistoryDraft}
            >
              <X size={16} />
              Limpiar
            </button>
          </form>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loadingHistory ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="spinner"></div>
                <p>Cargando ventas...</p>
              </div>
            ) : historyError ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <History size={48} />
                <h4>No se pudo cargar el historial</h4>
                <p>Intenta de nuevo en un momento</p>
              </div>
            ) : historySales.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <History size={48} />
                <h4>{hasHistoryFilters ? 'Sin resultados' : 'Sin ventas aún'}</h4>
                <p>{hasHistoryFilters ? 'Ninguna venta coincide con la búsqueda' : 'Las ventas aparecerán aquí'}</p>
              </div>
            ) : (
              historySales.map(sale => {
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
                            {sale.user?.name && (
                              <span style={{ marginLeft: '8px' }}>• {sale.user.name}</span>
                            )}
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
                          {paymentMethodLabel(sale.payment_method)}
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
                                  {item.product_name || item.product?.name || product?.name || `Producto ID: ${item.product_id}`}
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

                    {isExpanded && canViewSaleReceipts && sale.items?.length > 0 && (
                      <div style={{ padding: '0 12px 12px 36px', background: 'var(--surface)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openReceipt(sale)}
                        >
                          <Receipt size={16} />
                          Ver recibo
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Controles de paginación */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', gap: '12px', flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {historyPagination.total} ventas · Página {historyPagination.page} de {Math.max(historyPagination.totalPages, 1)}
              {fetchingHistory && !loadingHistory && <span style={{ marginLeft: '8px' }}>· actualizando...</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={!historyPagination.hasPrevPage}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setHistoryPage(p => p + 1)}
                disabled={!historyPagination.hasNextPage}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Productos con Menor Rotación */}
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
      
      {showExportModal && (
        <ExportSalesModal onClose={() => setShowExportModal(false)} />
      )}

      {receipt && (
        <SaleReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}
        </>
      )}
    </div>
  )
}

export default ReportsView
