export const PAYMENT_METHODS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  digital: 'Nequi/Daviplata',
  credit: 'Crédito',
  nequi: 'Nequi',
}

export function paymentMethodLabel(method) {
  if (!method) return 'Desconocido'
  return PAYMENT_METHODS[method] || method
}
