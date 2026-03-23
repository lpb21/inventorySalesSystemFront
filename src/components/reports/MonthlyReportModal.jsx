import { useState, useEffect } from 'react'
import { X, Download, FileText, Calendar, DollarSign, ShoppingCart } from 'lucide-react'
import { useSales } from '../../hooks/queries/useSales'

function MonthlyReportModal({ onClose, onGenerateReport }) {
  const { data: sales = [], isLoading: loadingSales } = useSales()
  const [reportData, setReportData] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!loadingSales && sales && Array.isArray(sales)) {
      generateMonthlyReport()
    }
  }, [sales, loadingSales])

  const generateMonthlyReport = () => {
    setGenerating(true)

    // Get current month sales
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Validate that sales exists before filtering
    if (!sales || !Array.isArray(sales)) {
      setReportData(null)
      setGenerating(false)
      return
    }

    const monthlySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
    })

    // Calculate statistics
    const totalRevenue = monthlySales.reduce((sum, s) => sum + Number(s.total || 0), 0)
    const totalTransactions = monthlySales.length
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    
    // Top selling products
    const productSales = {}
    monthlySales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const productName = item.product_name || 'Producto desconocido'
        if (!productSales[productName]) {
          productSales[productName] = { quantity: 0, revenue: 0 }
        }
        productSales[productName].quantity += Number(item.quantity || 0)
        productSales[productName].revenue += Number(item.subtotal || 0)
      })
    })

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Payment methods
    const paymentMethods = {}
    monthlySales.forEach(sale => {
      const method = sale.payment_method || 'cash'
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, amount: 0 }
      }
      paymentMethods[method].count += 1
      paymentMethods[method].amount += Number(sale.total || 0)
    })

    const report = {
      month: now.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      period: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      summary: {
        totalRevenue,
        totalTransactions,
        averageTicket,
        totalItems: monthlySales.reduce((sum, s) => sum + (s.items || []).reduce((iSum, i) => iSum + Number(i.quantity || 0), 0), 0)
      },
      topProducts,
      paymentMethods,
      dailyBreakdown: getDailyBreakdown(monthlySales),
      sales: monthlySales
    }

    setReportData(report)
    setGenerating(false)
  }

  const getDailyBreakdown = (monthlySales) => {
    const days = {}
    monthlySales.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0]
      if (!days[date]) {
        days[date] = { sales: 0, revenue: 0, transactions: 0 }
      }
      days[date].sales += 1
      days[date].revenue += Number(sale.total || 0)
      days[date].transactions += 1
    })
    return Object.entries(days)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const downloadCSV = () => {
    if (!reportData) return

    // CSV Header
    let csv = 'REPORTE MENSUAL - CIERRE DE CAJA\n'
    csv += `Período: ${reportData.month}\n`
    csv += `Generado: ${new Date().toLocaleString('es-ES')}\n\n`
    
    // Summary
    csv += 'RESUMEN GENERAL\n'
    csv += `Total de Ventas,${reportData.summary.totalRevenue.toLocaleString()}\n`
    csv += `Total de Transacciones,${reportData.summary.totalTransactions}\n`
    csv += `Ticket Promedio,${reportData.summary.averageTicket.toLocaleString()}\n`
    csv += `Total de Items Vendidos,${reportData.summary.totalItems}\n\n`

    // Daily breakdown
    csv += 'DESGLOSE DIARIO\n'
    csv += 'Fecha,Transacciones,Ingresos\n'
    reportData.dailyBreakdown.forEach(day => {
      csv += `${day.date},${day.transactions},${day.revenue.toLocaleString()}\n`
    })
    csv += '\n'

    // Top products
    csv += 'TOP 10 PRODUCTOS MÁS VENDIDOS\n'
    csv += 'Producto,Cantidad,Ingresos\n'
    reportData.topProducts.forEach(product => {
      csv += `"${product.name}",${product.quantity},${product.revenue.toLocaleString()}\n`
    })
    csv += '\n'

    // Payment methods
    csv += 'MÉTODOS DE PAGO\n'
    csv += 'Método,Transacciones,Monto\n'
    Object.entries(reportData.paymentMethods).forEach(([method, data]) => {
      const methodName = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method
      csv += `${methodName},${data.count},${data.amount.toLocaleString()}\n`
    })
    csv += '\n'

    // Detailed sales
    csv += 'DETALLE DE VENTAS\n'
    csv += 'Fecha,Ticket,Productos,Total,Método de Pago\n'
    reportData.sales.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleString('es-ES')
      const ticket = sale.ticket_number || sale.id?.slice(-6)
      const items = (sale.items || []).map(i => `${i.product_name} x${i.quantity}`).join('; ')
      const total = sale.total || 0
      const method = sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method === 'card' ? 'Tarjeta' : sale.payment_method
      csv += `"${date}","${ticket}","${items}",${total},"${method}"\n`
    })

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `cierre-caja-${reportData.period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadPDF = () => {
    // For now, we'll use a simple window.print() approach
    // In production, you might want to use a library like jsPDF
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Mensual - ${reportData?.month || ''}</title>
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
        <h1>📊 Reporte Mensual - Cierre de Caja</h1>
        <p><strong>Período:</strong> ${reportData?.month || ''}</p>
        <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total de Ventas</div>
            <div class="summary-value">$${reportData?.summary?.totalRevenue?.toLocaleString() || 0}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Transacciones</div>
            <div class="summary-value">${reportData?.summary?.totalTransactions || 0}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Ticket Promedio</div>
            <div class="summary-value">$${Math.round(reportData?.summary?.averageTicket || 0).toLocaleString()}</div>
          </div>
        </div>

        <h2>📈 Desglose Diario</h2>
        <table>
          <tr><th>Fecha</th><th>Transacciones</th><th>Ingresos</th></tr>
          ${reportData?.dailyBreakdown?.map(day => `
            <tr>
              <td>${day.date}</td>
              <td>${day.transactions}</td>
              <td>$${day.revenue.toLocaleString()}</td>
            </tr>
          `).join('') || ''}
        </table>

        <h2>🏆 Top Productos</h2>
        <table>
          <tr><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>
          ${reportData?.topProducts?.map(product => `
            <tr>
              <td>${product.name}</td>
              <td>${product.quantity}</td>
              <td>$${product.revenue.toLocaleString()}</td>
            </tr>
          `).join('') || ''}
        </table>

        <h2>💳 Métodos de Pago</h2>
        <table>
          <tr><th>Método</th><th>Transacciones</th><th>Monto</th></tr>
          ${Object.entries(reportData?.paymentMethods || {}).map(([method, data]) => `
            <tr>
              <td>${method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method}</td>
              <td>${data.count}</td>
              <td>$${data.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  const handleCloseMonth = () => {
    if (onGenerateReport) {
      onGenerateReport(reportData)
    }
    onClose()
  }

  if (generating) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h3>Generando reporte mensual...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Esto puede tomar unos segundos</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="modal-title">Cierre Mensual de Caja</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {reportData?.month}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              background: 'var(--surface)', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <DollarSign size={16} color="var(--accent)" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Ventas</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>
                ${reportData?.summary?.totalRevenue?.toLocaleString() || 0}
              </div>
            </div>

            <div style={{ 
              background: 'var(--surface)', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShoppingCart size={16} color="var(--success)" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Transacciones</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                {reportData?.summary?.totalTransactions || 0}
              </div>
            </div>

            <div style={{ 
              background: 'var(--surface)', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color="#3b82f6" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ticket Promedio</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                ${Math.round(reportData?.summary?.averageTicket || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>🏆 Top 5 Productos</h4>
            <div style={{ 
              background: 'var(--surface)', 
              borderRadius: '12px',
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              {reportData?.topProducts?.slice(0, 5).map((product, index) => (
                <div key={product.name} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: index < 4 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      background: index === 0 ? 'var(--accent)' : index === 1 ? '#ffc107' : index === 2 ? '#3b82f6' : 'var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontSize: '14px' }}>{product.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>${product.revenue.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{product.quantity} vendidos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div style={{ 
            background: 'rgba(255, 193, 7, 0.15)', 
            border: '1px solid var(--warning)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--warning)' }}>
              ⚠️ <strong>Importante:</strong> Al cerrar el mes, los valores de venta se reiniciarán a cero. 
              Asegúrate de descargar el reporte antes de continuar.
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={downloadCSV}>
            <Download size={18} />
            Descargar CSV
          </button>
          <button className="btn btn-secondary" onClick={downloadPDF}>
            <FileText size={18} />
            Imprimir PDF
          </button>
          <button className="btn btn-primary" onClick={handleCloseMonth}>
            Cerrar Mes y Reiniciar
          </button>
        </div>
      </div>
    </div>
  )
}

export default MonthlyReportModal
