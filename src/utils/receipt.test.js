// src/utils/receipt.test.js
import { describe, it, expect } from 'vitest';
import { buildReceiptData, buildReceiptHtml, formatMoney } from './receipt';

const tenant = { business_name: 'Tienda Doña Ana', tax_id: '900123456-7', address: 'Cra 1 # 2-3', phone: '3001234567' };
const cart = [{ id: 'p1', name: 'Arroz', unit: 'lb', price: 2500, quantity: 2 }];
const sale = {
  id: 'abc123456',
  ticket_number: '2026-000012',
  payment_method: 'cash',
  subtotal: '5000.00',
  discount: '0.00',
  tax: '0.00',
  total: '5000.00',
  created_at: '2026-10-08T15:00:00.000Z',
  items: [{ product_id: 'p1', product_name: 'Arroz', quantity: '2.000', unit_price: '2500.00', subtotal: '5000.00' }],
};

describe('buildReceiptData', () => {
  it('usa los totales del back y calcula el cambio con lo recibido', () => {
    const receipt = buildReceiptData({ sale, cart, tenant, cashierName: 'Leo', amountReceived: 10000 });
    expect(receipt.ticketNumber).toBe('2026-000012');
    expect(receipt.business.name).toBe('Tienda Doña Ana');
    expect(receipt.items).toEqual([{ name: 'Arroz', quantity: 2, unit: 'lb', unitPrice: 2500, subtotal: 5000 }]);
    expect(receipt.total).toBe(5000);
    expect(receipt.amountReceived).toBe(10000);
    expect(receipt.change).toBe(5000);
    expect(receipt.creditBalance).toBeNull();
  });

  it('arma el recibo desde el carrito si el back no devuelve items', () => {
    const receipt = buildReceiptData({ sale: { id: 'abc123456', payment_method: 'card' }, cart, amountReceived: 5000 });
    expect(receipt.ticketNumber).toBe('123456');
    expect(receipt.business.name).toBe('Mi Negocio');
    expect(receipt.total).toBe(5000);
    expect(receipt.change).toBe(0);
  });

  it('en ventas a crédito no hay recibido ni cambio, y lleva cliente y saldo', () => {
    const receipt = buildReceiptData({
      sale: { ...sale, payment_method: 'credit' },
      cart,
      customer: { name: 'Carlos' },
      creditBalance: 15000,
    });
    expect(receipt.amountReceived).toBe(0);
    expect(receipt.change).toBe(0);
    expect(receipt.customerName).toBe('Carlos');
    expect(receipt.creditBalance).toBe(15000);
  });
});

describe('buildReceiptHtml', () => {
  it('incluye negocio, número, items y totales', () => {
    const html = buildReceiptHtml(buildReceiptData({ sale, cart, tenant, amountReceived: 10000 }));
    expect(html).toContain('Tienda Doña Ana');
    expect(html).toContain('NIT: 900123456-7');
    expect(html).toContain('2026-000012');
    expect(html).toContain('Arroz');
    expect(html).toContain(formatMoney(5000));
    expect(html).toContain('Efectivo');
    expect(html).toContain('Cambio');
    expect(html).toContain('no es una factura');
  });

  it('usa RUT cuando el negocio lo eligió', () => {
    const html = buildReceiptHtml(buildReceiptData({ sale, cart, tenant: { ...tenant, tax_id_type: 'RUT' } }));
    expect(html).toContain('RUT: 900123456-7');
    expect(html).not.toContain('NIT:');
  });

  it('escapa el HTML de los nombres', () => {
    const receipt = buildReceiptData({
      sale: { payment_method: 'cash' },
      cart: [{ id: 'x', name: '<script>alert(1)</script>', unit: 'und', price: 100, quantity: 1 }],
    });
    const html = buildReceiptHtml(receipt);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('NIT:'); // sin número configurado no se imprime la línea
    expect(html).toContain('&lt;script&gt;');
  });

  it('en crédito muestra saldo pendiente y oculta recibido/cambio', () => {
    const html = buildReceiptHtml(buildReceiptData({
      sale: { ...sale, payment_method: 'credit' }, cart, customer: { name: 'Carlos' }, creditBalance: 15000,
    }));
    expect(html).toContain('Saldo pendiente');
    expect(html).not.toContain('Recibido');
  });
});
