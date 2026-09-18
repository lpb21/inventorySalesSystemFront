// src/utils/whatsapp.js
// Utilidades puras (sin React) para el botón "Enviar por WhatsApp" de fiados.
// La metadata "mobile" hace que isValid() solo acepte CELULARES:
// un fijo de Bogotá (601...) se rechaza, que es lo que queremos para WhatsApp.
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from 'libphonenumber-js';

export const DEFAULT_COUNTRY = 'CO';

// Lista corta a propósito: tenderos en Colombia. Venezuela va segundo
// porque buena parte de los clientes de fiado puede tener número venezolano.
const COUNTRY_NAMES = {
  CO: 'Colombia',
  VE: 'Venezuela',
  EC: 'Ecuador',
  PE: 'Perú',
  PA: 'Panamá',
  US: 'Estados Unidos',
  ES: 'España',
};

export const PHONE_COUNTRIES = Object.entries(COUNTRY_NAMES).map(([iso, name]) => ({
  iso,
  name,
  dial: getCountryCallingCode(iso), // '57', '58', ... sin hardcodear
}));

/**
 * Normaliza lo que digitó el tendero a E.164.
 * @returns {{ ok: true, e164: string } | { ok: false, error: string }}
 */
export function normalizePhone(country, raw) {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: false, error: 'Número vacío' };

  const parsed = parsePhoneNumberFromString(value, country || DEFAULT_COUNTRY);
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: 'No es un celular válido para ese país' };
  }
  return { ok: true, e164: parsed.number }; // '+573001234567'
}

/** wa.me exige solo dígitos: sin '+', espacios ni guiones. */
export function buildWaUrl(e164, text) {
  const digits = String(e164).replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Sequelize devuelve DECIMAL de Postgres como STRING ("12500.00").
// Por eso todo pasa por toNumber antes de formatear.
function toNumber(v) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new TypeError(`Monto inválido: ${v}`);
  return n;
}

const copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
export const formatCOP = (v) => copFmt.format(toNumber(v));

const qtyFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const WEIGHT_UNITS = new Set(['lb', 'kg']);
function formatQty({ quantity, unit }) {
  const q = qtyFmt.format(toNumber(quantity));
  return WEIGHT_UNITS.has(unit) ? `${q} ${unit}` : `${q} und`;
}

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', // la fecha del tendero, no la del servidor
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
export const formatDate = (d) => dateFmt.format(new Date(d));

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';

// URLs de wa.me muy largas fallan en algunos navegadores/dispositivos.
// Cortamos el detalle y dejamos el total, que es lo que importa.
export const MAX_ITEMS = 12;

/**
 * Mensaje de cargo (fiado).
 * items: [{ name, quantity, unit: 'lb' | 'und', subtotal }]
 * balance: saldo DESPUÉS de registrar el fiado, tal como lo devuelve el backend.
 */
export function buildChargeMessage({ customerName, businessName, date, items, total, balance }) {
  const shown = items.slice(0, MAX_ITEMS);
  const rest = items.length - shown.length;

  const lines = [
    `Hola ${firstName(customerName)},`,
    `${businessName} te registró un fiado el ${formatDate(date)}:`,
    '',
    ...shown.map((i) => `• ${formatQty(i)} ${i.name} — ${formatCOP(i.subtotal)}`),
  ];
  if (rest > 0) lines.push(`• y ${rest} producto${rest === 1 ? '' : 's'} más`);

  lines.push(
    '',
    `*Total de esta compra:* ${formatCOP(total)}`,
    `*Saldo pendiente:* ${formatCOP(balance)}`,
  );
  return lines.join('\n');
}

/** Mensaje de abono. balance: saldo DESPUÉS del abono. */
export function buildPaymentMessage({ customerName, businessName, date, amount, balance }) {
  const settled = toNumber(balance) <= 0;
  return [
    `Hola ${firstName(customerName)},`,
    `${businessName} recibió tu abono el ${formatDate(date)}.`,
    '',
    `*Abono:* ${formatCOP(amount)}`,
    settled
      ? '*Tu cuenta quedó al día.* ¡Gracias!'
      : `*Saldo pendiente a la fecha:* ${formatCOP(balance)}`,
  ].join('\n');
}

// --- Reutilizar una sola pestaña de WhatsApp entre envíos sucesivos ---
// Un <a target="_blank" rel="noopener"> SIEMPRE abre pestaña nueva: el navegador
// no registra el nombre de una ventana "noopener", así que el truco de
// target="mismo-nombre" no funciona con noopener/noreferrer presentes.
// Por eso se controla la ventana manualmente, sin noopener, confiando en que
// el destino (wa.me / whatsapp.com) es fijo y conocido.
let waWindowRef = null;

export function openWhatsApp(url) {
  if (waWindowRef && !waWindowRef.closed) {
    waWindowRef.location.href = url;
    waWindowRef.focus();
  } else {
    waWindowRef = window.open(url, 'whatsapp_send');
  }
}