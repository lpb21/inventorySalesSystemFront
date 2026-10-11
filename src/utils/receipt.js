/**
 * Recibo de compra (funciones puras, testeables).
 *
 * buildReceiptData arma un objeto plano con todo lo que se imprime y
 * buildReceiptHtml lo convierte en un documento para impresora térmica de 80mm.
 *
 * Facturación electrónica: cuando se integre, sus datos (CUFE, QR, resolución,
 * NIT, etc.) se agregan en `receipt.fiscal` y se pintan en buildReceiptHtml.
 * Mientras sea null, el recibo aclara que no es una factura.
 */
import { normalizeNumber, formatQuantity } from './measurements'
import { paymentMethodLabel } from './paymentMethods'
import { getLineDiscount, getLineTotal, normalizeDiscountPercent } from './discounts'

export function formatMoney(value) {
  return `$${Math.round(normalizeNumber(value, 0)).toLocaleString('es-CO')}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * @param sale            respuesta del back al crear la venta (totales y precios confirmados)
 * @param cart            carrito al momento de cobrar (aporta la unidad de cada producto)
 * @param tenant          negocio del usuario (currentUser.tenant)
 * @param cashierName     quien registró la venta
 * @param amountReceived  monto entregado por el cliente (ventas de contado)
 * @param customer        cliente, en ventas a crédito
 * @param creditBalance   saldo pendiente del cliente tras la venta a crédito
 */
export function buildReceiptData({
  sale = {},
  cart = [],
  tenant = null,
  cashierName = '',
  amountReceived = null,
  customer = null,
  creditBalance = null,
} = {}) {
  const cartById = new Map(cart.map(item => [item.id, item]))

  // Los items del back traen el precio real cobrado; el carrito es el respaldo
  const sourceItems = Array.isArray(sale.items) && sale.items.length
    ? sale.items.map(item => {
        const cartItem = cartById.get(item.product_id)
        return {
          name: item.product_name || item.product?.name || cartItem?.name || 'Producto',
          quantity: normalizeNumber(item.quantity, 0),
          unit: cartItem?.unit || '',
          unitPrice: normalizeNumber(item.unit_price, 0),
          discountPercent: normalizeDiscountPercent(item.discount_percent),
          discountAmount: normalizeNumber(item.discount_amount, 0),
          subtotal: normalizeNumber(item.subtotal, 0),
        }
      })
    : cart.map(item => ({
        name: item.name,
        quantity: normalizeNumber(item.quantity, 0),
        unit: item.unit || '',
        unitPrice: normalizeNumber(item.price, 0),
        discountPercent: normalizeDiscountPercent(item.discount_percent),
        discountAmount: getLineDiscount(item),
        subtotal: getLineTotal(item),
      }))

  // Sin totales del back, el subtotal es el bruto y el descuento la suma de las líneas
  const itemsDiscount = sourceItems.reduce((sum, item) => sum + item.discountAmount, 0)

  const itemsTotal = sourceItems.reduce((sum, item) => sum + item.subtotal, 0)
  const total = normalizeNumber(sale.total, itemsTotal)
  const isCredit = sale.payment_method === 'credit'
  const received = isCredit ? 0 : normalizeNumber(amountReceived, total)

  return {
    ticketNumber: sale.ticket_number || (sale.id ? String(sale.id).slice(-6) : ''),
    date: sale.created_at || new Date().toISOString(),
    business: {
      name: tenant?.business_name || tenant?.name || 'Mi Negocio',
      taxId: tenant?.tax_id || '',
      taxIdType: tenant?.tax_id_type === 'RUT' ? 'RUT' : 'NIT',
      address: tenant?.address || '',
      phone: tenant?.phone || '',
    },
    cashier: cashierName || '',
    customerName: customer?.name || sale.customer_name || '',
    items: sourceItems,
    subtotal: normalizeNumber(sale.subtotal, itemsTotal + itemsDiscount),
    discount: normalizeNumber(sale.discount, itemsDiscount),
    tax: normalizeNumber(sale.tax, 0),
    total,
    paymentMethod: sale.payment_method || 'cash',
    amountReceived: received,
    change: isCredit ? 0 : Math.max(0, received - total),
    creditBalance: isCredit && creditBalance != null ? normalizeNumber(creditBalance, 0) : null,
    fiscal: null,
  }
}

export function buildReceiptHtml(receipt) {
  const isCredit = receipt.paymentMethod === 'credit'
  const date = new Date(receipt.date).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const row = (label, value, className = '') =>
    `<div class="row ${className}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`

  const items = receipt.items.map(item => `
    <div class="item">
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="row">
        <span>${escapeHtml(formatQuantity(item.quantity))} ${escapeHtml(item.unit)} x ${escapeHtml(formatMoney(item.unitPrice))}</span>
        <span>${escapeHtml(formatMoney(item.subtotal + item.discountAmount))}</span>
      </div>
      ${item.discountAmount > 0 ? `<div class="row muted">
        <span>Descuento ${escapeHtml(item.discountPercent)}%</span>
        <span>-${escapeHtml(formatMoney(item.discountAmount))}</span>
      </div>` : ''}
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Recibo ${escapeHtml(receipt.ticketNumber)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: 80mm; max-width: 100%; margin: 0 auto; padding: 4mm;
    font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.35; color: #000;
  }
  .center { text-align: center; }
  .business { font-size: 16px; font-weight: bold; text-transform: uppercase; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .item { margin-bottom: 4px; }
  .item-name { font-weight: bold; overflow-wrap: anywhere; }
  .total { font-size: 16px; font-weight: bold; }
  .muted { font-size: 11px; }
</style>
</head>
<body>
  <div class="center">
    <div class="business">${escapeHtml(receipt.business.name)}</div>
    ${receipt.business.taxId ? `<div>${receipt.business.taxIdType}: ${escapeHtml(receipt.business.taxId)}</div>` : ''}
    ${receipt.business.address ? `<div>${escapeHtml(receipt.business.address)}</div>` : ''}
    ${receipt.business.phone ? `<div>Tel: ${escapeHtml(receipt.business.phone)}</div>` : ''}
  </div>
  <div class="sep"></div>
  <div class="center"><strong>RECIBO DE COMPRA</strong></div>
  ${row('Recibo N°', receipt.ticketNumber)}
  ${row('Fecha', date)}
  ${receipt.cashier ? row('Atendió', receipt.cashier) : ''}
  ${receipt.customerName ? row('Cliente', receipt.customerName) : ''}
  <div class="sep"></div>
  ${items}
  <div class="sep"></div>
  ${row('Subtotal', formatMoney(receipt.subtotal))}
  ${receipt.discount > 0 ? row('Descuento', `-${formatMoney(receipt.discount)}`) : ''}
  ${receipt.tax > 0 ? row('Impuestos', formatMoney(receipt.tax)) : ''}
  ${row('TOTAL', formatMoney(receipt.total), 'total')}
  <div class="sep"></div>
  ${row('Forma de pago', paymentMethodLabel(receipt.paymentMethod))}
  ${isCredit ? '' : row('Recibido', formatMoney(receipt.amountReceived))}
  ${isCredit ? '' : row('Cambio', formatMoney(receipt.change))}
  ${receipt.creditBalance != null ? row('Saldo pendiente', formatMoney(receipt.creditBalance)) : ''}
  <div class="sep"></div>
  <div class="center">¡Gracias por su compra!</div>
  ${receipt.fiscal ? '' : '<div class="center muted">Este recibo no es una factura de venta</div>'}
</body>
</html>`
}
