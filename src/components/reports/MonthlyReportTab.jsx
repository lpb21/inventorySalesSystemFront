import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Download, FileText, Search,
  DollarSign, ShoppingCart, Receipt, Calendar
} from 'lucide-react'
import { reportsAPI } from '../../api/config'
import { PAYMENT_METHODS, paymentMethodLabel } from '../../utils/paymentMethods'

const METHOD_FILTERS = [
  { value: '', label: 'Todos los métodos' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'digital', label: 'Nequi/Daviplata' },
  { value: 'credit', label: 'Crédito' },
]

function sanitizeCSVCell(value) {
  let str = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`
  return `"${str.replace(/"/g, '""')}"`
}

function formatAmount(value) {
  const num = Number(value) || 0
  return `$${num.toLocaleString('es-CO')}`
}

function formatQuantity(value) {
  const num = Number(value) || 0
  return num.toLocaleString('es-CO', { maximumFractionDigits: 3 })
}

function MonthlyReportTab() {
  const now = new Date()
  const [monthCursor, setMonthCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [page, setPage] = useState(1)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [search, setSearch] = useState('')

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth() + 1
  const monthLabel = monthCursor.toLocaleString('es-CO', { month: 'long', year: 'numeric' })

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const canGoNext = monthCursor.getTime() < currentMonthStart.getTime()

  const canGoPrev = true

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reports', 'monthly', year, month, page, paymentMethodFilter, search],
    queryFn: async () => {
      const params = { year, month, page, limit: 20 }
      if (paymentMethodFilter) params.payment_method = paymentMethodFilter
      if (search) params.q = search
      return reportsAPI.getMonthly(params)
    },
    placeholderData: keepPreviousData,
  })

  const summary = data?.summary || {}
  const paymentMethods = data?.paymentMethods || []
  const dailyBreakdown = data?.dailyBreakdown || []
  const topProducts = data?.topProducts || []
  const sales = data?.sales || []
  const pagination = data?.pagination || {}

  const changeMonth = (delta) => {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setPage(1)
  }

  const downloadCSV = () => {
    if (!data) return

    let csv = '\uFEFFREPORTE MENSUAL - CIERRE DE CAJA\n'
    csv += `Período: ${monthLabel}\n`
    csv += `Generado: ${new Date().toLocaleString('es-CO')}\n\n`

    csv += 'RESUMEN GENERAL\n'
    csv += `Total de Ventas,${summary.totalRevenue?.toLocaleString('es-CO')}\n`
    csv += `Total de Transacciones,${summary.totalTransactions}\n`
    csv += `Ticket Promedio,${(summary.averageTicket || 0).toLocaleString('es-CO')}\n`
    csv += `Total de Items Vendidos,${summary.totalItems}\n\n`

    csv += 'MÉTODOS DE PAGO\n'
    csv += 'Método,Transacciones,Monto\n'
    paymentMethods.forEach((pm) => {
      csv += `${paymentMethodLabel(pm.method)},${pm.count},${pm.amount?.toLocaleString('es-CO')}\n`
    })
    csv += '\n'

    csv += 'DESGLOSE DIARIO\n'
    csv += 'Fecha,Transacciones,Ingresos\n'
    dailyBreakdown.forEach((day) => {
      csv += `${day.date},${day.transactions},${day.revenue?.toLocaleString('es-CO')}\n`
    })
    csv += '\n'

    csv += 'TOP 10 PRODUCTOS\n'
    csv += 'Producto,Cantidad,Ingresos\n'
    topProducts.forEach((p) => {
      csv += `${sanitizeCSVCell(p.name)},${p.quantity},${p.revenue?.toLocaleString('es-CO')}\n`
    })
    csv += '\n'

    csv += 'DETALLE DE VENTAS (PÁGINA ACTUAL)\n'
    csv += 'Fecha,Ticket,Cliente,Productos,Total,Método de Pago\n'
    sales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleString('es-CO')
      const ticket = sale.ticket_number || sale.id?.slice(-6)
      const client = sale.customer_name || 'Mostrador'
      const items = (sale.items || []).map((i) => `${i.product?.name || 'Producto'} x${i.quantity}`).join('; ')
      csv += `${sanitizeCSVCell(date)},${sanitizeCSVCell(ticket)},${sanitizeCSVCell(client)},${sanitizeCSVCell(items)},${sale.total},${paymentMethodLabel(sale.payment_method)}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `cierre-caja-${year}-${String(month).padStart(2, '0')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadPDF = () => {
    if (!data) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Mensual - ${monthLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1a1a2e; border-bottom: 3px solid #e94560; padding-bottom: 10px; }
          h2 { color: #16213e; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #1a1a2e; color: white; }
          .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .summary-item { display: inline-block; margin-right: 40px; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 24px; font-weight: bold; color: #e94560; }
        </style>
      </head>
      <body>
        <h1>Reporte Mensual - Cierre de Caja</h1>
        <p><strong>Período:</strong> ${monthLabel}</p>
        <p><strong>Generado:</strong> ${new Date().toLocaleString('es-CO')}</p>
        <div class="summary">
          <div class="summary-item"><div class="summary-label">Total de Ventas</div><div class="summary-value">${formatAmount(summary.totalRevenue)}</div></div>
          <div class="summary-item"><div class="summary-label">Transacciones</div><div class="summary-value">${summary.totalTransactions || 0}</div></div>
          <div class="summary-item"><div class="summary-label">Ticket Promedio</div><div class="summary-value">${formatAmount(Math.round(summary.averageTicket || 0))}</div></div>
          <div class="summary-item"><div class="summary-label">Items Vendidos</div><div class="summary-value">${summary.totalItems || 0}</div></div>
        </div>
        <h2>Métodos de Pago</h2>
        <table><tr><th>Método</th><th>Transacciones</th><th>Monto</th></tr>
        ${paymentMethods.map((pm) => `<tr><td>${paymentMethodLabel(pm.method)}</td><td>${pm.count}</td><td>${formatAmount(pm.amount)}</td></tr>`).join('')}
        </table>
        <h2>Desglose Diario</h2>
        <table><tr><th>Fecha</th><th>Transacciones</th><th>Ingresos</th></tr>
        ${dailyBreakdown.map((day) => `<tr><td>${day.date}</td><td>${day.transactions}</td><td>${formatAmount(day.revenue)}</td></tr>`).join('')}
        </table>
        <h2>Top Productos</h2>
        <table><tr><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>
        ${topProducts.map((p) => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>${formatAmount(p.revenue)}</td></tr>`).join('')}
        </table>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  if (isLoading) {
    return <div className="empty-state" style={{ padding: '40px' }}><div className="spinner"></div><p>Cargando cierre mensual...</p></div>
  }

  return (
    <div>
      {/* Selector de mes + acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => changeMonth(-1)} disabled={!canGoPrev} title="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <div style={{ minWidth: '180px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, textTransform: 'capitalize' }}>
              <Calendar size={16} color="var(--accent)" />
              {monthLabel}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => changeMonth(1)} disabled={!canGoNext} title="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={downloadCSV} disabled={!data}>
            <Download size={18} /> Descargar CSV
          </button>
          <button className="btn btn-secondary" onClick={downloadPDF} disabled={!data}>
            <FileText size={18} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card primary">
          <div className="stat-icon primary"><DollarSign /></div>
          <div className="stat-value">{formatAmount(summary.totalRevenue)}</div>
          <div className="stat-label">Total Ventas</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><ShoppingCart /></div>
          <div className="stat-value">{summary.totalTransactions || 0}</div>
          <div className="stat-label">Transacciones</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon info"><Receipt /></div>
          <div className="stat-value">{formatAmount(Math.round(summary.averageTicket || 0))}</div>
          <div className="stat-label">Ticket Promedio</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon info"><FileText /></div>
          <div className="stat-value">{formatQuantity(summary.totalItems)}</div>
          <div className="stat-label">Items Vendidos</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Métodos de pago */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Métodos de Pago</h3></div>
          <div className="table-container">
            {paymentMethods.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}><p>Sin datos para este mes</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Método</th><th>Transacciones</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {paymentMethods.map((pm) => (
                    <tr key={pm.method}>
                      <td>{paymentMethodLabel(pm.method)}</td>
                      <td>{pm.count}</td>
                      <td>{formatAmount(pm.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top productos */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Top Productos</h3></div>
          <div className="table-container">
            {topProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}><p>Sin datos para este mes</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{formatQuantity(p.quantity)}</td>
                      <td>{formatAmount(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Desglose diario */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header"><h3 className="card-title">Desglose Diario</h3></div>
        <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {dailyBreakdown.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}><p>Sin ventas en este mes</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Fecha</th><th>Transacciones</th><th>Ingresos</th></tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>{day.transactions}</td>
                    <td>{formatAmount(day.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detalle de ventas con filtros y paginación */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="card-title">Detalle de Ventas</h3>
          <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={paymentMethodFilter}
              onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1) }}
            >
              {METHOD_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '34px', width: '220px' }}
                placeholder="Buscar ticket o cliente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          {sales.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}><p>No hay ventas para los filtros seleccionados</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ticket</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Método</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.created_at).toLocaleString('es-CO')}</td>
                    <td>{sale.ticket_number || sale.id?.slice(-6)}</td>
                    <td>{sale.customer_name || 'Mostrador'}</td>
                    <td>{(sale.items || []).map((i) => `${i.product?.name || 'Producto'} x${formatQuantity(i.quantity)}`).join(', ')}</td>
                    <td>{paymentMethodLabel(sale.payment_method)}</td>
                    <td style={{ fontWeight: 600 }}>{formatAmount(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '12px 16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} ventas)
            </span>
            <button className="btn btn-secondary" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {isFetching && <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>Actualizando...</div>}
      </div>
    </div>
  )
}

export default MonthlyReportTab
