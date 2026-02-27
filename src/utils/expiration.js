/**
 * Utility functions for handling product expiration logic
 */

/**
 * Check if a product is nearing expiration (within specified days)
 * @param {Object} product - Product object with expiry_date
 * @param {number} daysThreshold - Number of days to consider as "nearing expiration" (default: 7)
 * @returns {boolean} - True if product is nearing expiration
 */
export function isNearingExpiration(product, daysThreshold = 7) {
  if (!product.expiry_date) return false;

  const expiryDate = new Date(product.expiry_date);
  const today = new Date();
  const timeDiff = expiryDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return daysDiff >= 0 && daysDiff <= daysThreshold;
}

/**
 * Get days until expiration
 * @param {Object} product - Product object with expiry_date
 * @returns {number|null} - Days until expiration, null if no expiry date
 */
export function getDaysUntilExpiration(product) {
  if (!product.expiry_date) return null;

  const expiryDate = new Date(product.expiry_date);
  const today = new Date();
  const timeDiff = expiryDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return daysDiff;
}

/**
 * Filter products that are nearing expiration
 * @param {Array} products - Array of product objects
 * @param {number} daysThreshold - Number of days threshold (default: 7)
 * @returns {Array} - Filtered array of products nearing expiration
 */
export function getProductsNearingExpiration(products, daysThreshold = 7) {
  return products.filter(product => isNearingExpiration(product, daysThreshold));
}

/**
 * Get expiration status for a product
 * @param {Object} product - Product object
 * @returns {Object} - Status object with type and message
 */
export function getExpirationStatus(product) {
  const days = getDaysUntilExpiration(product);

  if (days === null) return { type: 'none', message: 'Sin fecha de vencimiento' };
  if (days < 0) return { type: 'expired', message: 'Vencido' };
  if (days === 0) return { type: 'today', message: 'Vence hoy' };
  if (days === 1) return { type: 'tomorrow', message: 'Vence mañana' };
  if (days <= 3) return { type: 'critical', message: `Vence en ${days} días` };
  if (days <= 7) return { type: 'warning', message: `Vence en ${days} días` };

  return { type: 'normal', message: `Vence en ${days} días` };
}
