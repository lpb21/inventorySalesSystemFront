// src/utils/support.js
// Contacto de soporte y ventas de Punto Fresco.
// Más adelante lo reutiliza el widget de contacto de la página.
import { buildWaUrl } from './whatsapp'

export const SUPPORT_WHATSAPP_E164 = '+573229400730'

/** wa.me al WhatsApp de soporte con un mensaje ya escrito. */
export const buildSupportWhatsappUrl = (text) => buildWaUrl(SUPPORT_WHATSAPP_E164, text)

export const buildSmsRechargeMessage = (businessName) =>
  `Hola, quiero recargar SMS para ${businessName || 'mi negocio'}.`
