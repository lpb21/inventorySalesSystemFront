/**
 * Utilidades de imágenes de producto.
 *
 * El backend normaliza TODA imagen (WebP 512x512 con sharp); aquí solo se valida y
 * se reduce la foto antes de subirla para que viaje rápido desde el celular.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // mismo límite que el backend
export const MAX_CLIENT_DIMENSION = 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const OFF_ATTRIBUTION = {
  text: 'Imagen: Open Food Facts contributors',
  license: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
}

/**
 * Mismo criterio que el backend: EAN-8, UPC-A, EAN-13 o GTIN-14 (8 a 14 dígitos).
 * Devuelve el código limpio o null si no sirve para buscar en Open Food Facts.
 */
export function normalizeLookupBarcode(code) {
  if (code === undefined || code === null) return null
  const clean = String(code).trim().replace(/[\s-]/g, '')
  return /^\d{8,14}$/.test(clean) ? clean : null
}

/**
 * Valida el archivo elegido por el usuario antes de procesarlo.
 * @returns {{ valid: boolean, message: string }}
 */
export function validateImageFile(file) {
  if (!file) return { valid: false, message: 'No se seleccionó ninguna imagen' }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, message: 'Solo se permiten imágenes JPG, PNG o WebP' }
  }
  // Se permite algo más que el límite: la compresión en el navegador la reduce después
  if (file.size > MAX_UPLOAD_BYTES * 4) {
    return { valid: false, message: 'La imagen es demasiado grande (máx. 20MB antes de comprimir)' }
  }
  return { valid: true, message: '' }
}

/**
 * Dimensiones destino conservando proporción, sin agrandar imágenes pequeñas.
 */
export function computeTargetSize(width, height, maxDimension = MAX_CLIENT_DIMENSION) {
  if (!width || !height) return { width: 0, height: 0 }
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    // Respeta la orientación EXIF de las fotos de celular
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Reduce la foto a máx. 1024px (JPEG 0.85). Si algo falla o no mejora el tamaño,
 * devuelve el archivo original: el servidor igual la normaliza.
 */
export async function compressImageFile(file, maxDimension = MAX_CLIENT_DIMENSION) {
  try {
    const source = await loadBitmap(file)
    const srcW = source.width
    const srcH = source.height
    const { width, height } = computeTargetSize(srcW, srcH, maxDimension)

    if (width === srcW && height === srcH && file.size <= MAX_UPLOAD_BYTES) {
      source.close?.()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    // Fondo blanco para PNG con transparencia (JPEG no tiene alfa)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(source, 0, 0, width, height)
    source.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * true si la imagen del producto viene de Open Food Facts (requiere atribución CC BY-SA)
 */
export function isOpenFoodFactsImage(product) {
  return product?.image_source === 'off'
}

export function imageAttributionTitle(product) {
  return isOpenFoodFactsImage(product)
    ? `${OFF_ATTRIBUTION.text} · ${OFF_ATTRIBUTION.license}`
    : undefined
}

/**
 * Mensaje para el usuario según el resultado de "Buscar imagen" (POST /products/:id/image/lookup)
 */
export function lookupResultMessage(result) {
  switch (result?.status) {
    case 'updated':
      return { type: 'success', message: 'Imagen encontrada en Open Food Facts' }
    case 'not_found':
      return { type: 'warning', message: 'No se encontró imagen para este código de barras' }
    case 'unavailable':
      return { type: 'warning', message: 'Open Food Facts no está disponible, intenta más tarde' }
    case 'skipped':
      if (result.reason === 'no_barcode') {
        return { type: 'warning', message: 'El producto necesita un código de barras válido (8 a 14 dígitos)' }
      }
      if (result.reason === 'storage_not_configured') {
        return { type: 'error', message: 'El almacenamiento de imágenes no está configurado' }
      }
      return { type: 'warning', message: 'No se actualizó la imagen' }
    default:
      return { type: 'error', message: 'No se pudo buscar la imagen' }
  }
}

/**
 * Extrae el mensaje de error del backend ({ error: { message } }) o uno genérico
 */
export function apiErrorMessage(error, fallback = 'Ocurrió un error') {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback
}
