// src/utils/whatsapp.test.js
import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  buildWaUrl,
  buildChargeMessage,
  buildPaymentMessage,
  PHONE_COUNTRIES,
  MAX_ITEMS,
} from './whatsapp';

// Intl mete espacio no separable (U+00A0) en "$ 12.500"; lo aplanamos para comparar.
const flat = (s) => s.replace(/\u00a0/g, ' ');

describe('normalizePhone', () => {
  it('acepta celular colombiano con o sin espacios', () => {
    expect(normalizePhone('CO', '300 123 4567')).toEqual({ ok: true, e164: '+573001234567' });
    expect(normalizePhone('CO', '3001234567')).toEqual({ ok: true, e164: '+573001234567' });
  });

  it('acepta un fijo de Bogotá como número válido (import general, no distingue móvil/fijo)', () => {
    // Se usa libphonenumber-js general (no el subpath /mobile) porque ese subpath
    // rompía la resolución de módulos en Vite. Costo aceptado: ya no se filtran
    // fijos aquí. En la práctica el tendero siempre registra el celular del cliente.
    expect(normalizePhone('CO', '6015551234')).toEqual({ ok: true, e164: '+576015551234' });
  });

  it('acepta celular venezolano', () => {
    expect(normalizePhone('VE', '4121234567')).toEqual({ ok: true, e164: '+584121234567' });
  });

  it('rechaza vacío', () => {
    expect(normalizePhone('CO', '   ').ok).toBe(false);
  });

  it('Colombia es la primera opción de la lista', () => {
    expect(PHONE_COUNTRIES[0]).toEqual({ iso: 'CO', name: 'Colombia', dial: '57' });
  });
});

describe('buildWaUrl', () => {
  it('quita el + y codifica saltos de línea', () => {
    const url = buildWaUrl('+573001234567', 'Hola\nmundo');
    expect(url).toBe('https://wa.me/573001234567?text=Hola%0Amundo');
  });
});


describe('formatQty via buildChargeMessage (unidades de peso)', () => {
  it('soporta kg además de lb', () => {
    const msg = flat(buildChargeMessage({
      customerName: 'Ana',
      businessName: 'Salsamentaría Doña Rosa',
      date: '2026-09-21T15:00:00Z',
      total: '8000.00',
      balance: '8000.00',
      items: [
        { name: 'Chorizo', quantity: '0.5', unit: 'kg', subtotal: '8000.00' },
      ],
    }));
    expect(msg).toContain('• 0,5 kg Chorizo — $ 8.000');
  });

  it('un item sin unit (venta por unidad) se muestra como und', () => {
    const msg = flat(buildChargeMessage({
      customerName: 'Ana',
      businessName: 'Salsamentaría Doña Rosa',
      date: '2026-09-21T15:00:00Z',
      total: '3000.00',
      balance: '3000.00',
      items: [
        { name: 'Bolsa de hielo', quantity: 3, subtotal: '3000.00' },
      ],
    }));
    expect(msg).toContain('• 3 und Bolsa de hielo — $ 3.000');
  });
});


describe('buildChargeMessage', () => {
  const base = {
    customerName: '  María José Pérez ',
    businessName: 'Salsamentaría Doña Rosa',
    date: '2026-09-21T15:00:00Z',
    total: '17000.00', // DECIMAL como string, como lo manda Sequelize
    balance: '45500.00',
  };

  it('arma el mensaje con peso, unidades y saldo', () => {
    const msg = flat(buildChargeMessage({
      ...base,
      items: [
        { name: 'Queso campesino', quantity: '1.5', unit: 'lb', subtotal: '12000.00' },
        { name: 'Gaseosa 400ml', quantity: 2, unit: 'und', subtotal: 5000 },
      ],
    }));
    expect(msg).toContain('Hola María,');
    expect(msg).toContain('el 21/09/2026');
    expect(msg).toContain('• 1,5 lb Queso campesino — $ 12.000');
    expect(msg).toContain('• 2 und Gaseosa 400ml — $ 5.000');
    expect(msg).toContain('*Total de esta compra:* $ 17.000');
    expect(msg).toContain('*Saldo pendiente:* $ 45.500');
  });

  it('corta la lista larga y avisa cuántos faltan', () => {
    const items = Array.from({ length: MAX_ITEMS + 3 }, (_, i) => ({
      name: `P${i}`, quantity: 1, unit: 'und', subtotal: 1000,
    }));
    const msg = buildChargeMessage({ ...base, items });
    expect(msg.match(/^• 1 und/gm)).toHaveLength(MAX_ITEMS);
    expect(msg).toContain('• y 3 productos más');
  });

  it('falla fuerte si llega un monto basura en vez de mandar "$ NaN"', () => {
    expect(() => buildChargeMessage({ ...base, balance: undefined, items: [] })).toThrow();
  });
});

describe('buildPaymentMessage', () => {
  const base = {
    customerName: 'Pedro',
    businessName: 'Salsamentaría Doña Rosa',
    date: '2026-09-21T15:00:00Z',
    amount: '20000.00',
  };

  it('muestra abono y saldo pendiente', () => {
    const msg = flat(buildPaymentMessage({ ...base, balance: '25500.00' }));
    expect(msg).toContain('*Abono:* $ 20.000');
    expect(msg).toContain('*Saldo pendiente a la fecha:* $ 25.500');
  });

  it('si el saldo queda en cero, dice que está al día', () => {
    const msg = buildPaymentMessage({ ...base, balance: '0.00' });
    expect(msg).toContain('Tu cuenta quedó al día');
    expect(msg).not.toContain('Saldo pendiente');
  });
});