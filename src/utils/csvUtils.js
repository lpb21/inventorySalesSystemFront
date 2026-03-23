/**
 * Utilidades para manejo y validación de archivos CSV
 */

// Columnas OBLIGATORIAS a nivel de estructura (el backend exige al menos "name")
export const REQUIRED_CSV_HEADERS = ['name']

// Nombres alternativos que aceptamos por columna (p. ej. "nombre" -> "name")
export const HEADER_ALIASES = {
  nombre: 'name',
  name: 'name',
  descripcion: 'description',
  descripción: 'description',
  description: 'description',
  categoria: 'category',
  categoría: 'category',
  category: 'category',
  categorias: 'category',
  categorías: 'category',
  categories: 'category',
  precio: 'price',
  price: 'price',
  costo: 'cost',
  cost: 'cost',
  codigo: 'sku',
  código: 'sku',
  sku: 'sku',
  codigo_barras: 'barcode',
  barras: 'barcode',
  barcode: 'barcode',
  stock: 'stock',
  stock_minimo: 'min_stock',
  min_stock: 'min_stock',
  unidad: 'unit',
  unit: 'unit',
  tipo: 'type',
  type: 'type',
  fecha_vencimiento: 'expiry_date',
  expiry_date: 'expiry_date',
  proveedor: 'supplier',
  supplier: 'supplier',
  proveedores: 'supplier',
  suppliers: 'supplier',
  notas: 'notes',
  notes: 'notes',
  nota: 'notes',
}

/**
 * Parsea una línea CSV respetando comillas (campos con comas).
 * @param {string} line - Línea CSV a parsear
 * @returns {string[]} Array de valores parseados
 */
export function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Normaliza nombre de cabecera para comparación (minúsculas, sin comillas, alias).
 * @param {string} header - Cabecera a normalizar
 * @returns {string} Cabecera normalizada
 */
export function normalizeHeader(header) {
  // Eliminar BOM (Byte Order Mark), comillas, espacios y normalizar a minúsculas
  const raw = (header || '').trim()
    .replace(/^\uFEFF/, '')
    .replace(/^"|"$/g, '')
    .toLowerCase()
  return HEADER_ALIASES[raw] || raw
}

/**
 * Valida la estructura del CSV: que exista encabezado y al menos una fila con nombre.
 * Deja que el backend valide detalles como categoría existente o precios numéricos.
 * @param {string} text - Contenido del archivo CSV
 * @returns {{valid: boolean, errors?: string[], totalProducts?: number, headers?: string[]}}
 */
export function validateCSVStructure(text) {
  const errors = []
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)

  if (lines.length < 2) {
    errors.push('El archivo debe tener una fila de encabezados y al menos una fila de datos.')
    return { valid: false, errors }
  }

  const headerLine = lines[0]

  // Detectar delimitador (punto y coma o coma)
  let delimiter = ','
  if (!headerLine.includes(',') && headerLine.includes(';')) {
    delimiter = ';'
  }

  const headerCells = delimiter === ',' ? parseCSVLine(headerLine) : headerLine.split(';')
  const normalizedHeaders = headerCells.map((h) => normalizeHeader(h))

  const missing = REQUIRED_CSV_HEADERS.filter((req) => !normalizedHeaders.includes(req))
  if (missing.length > 0) {
    errors.push(`Faltan columnas obligatorias: ${missing.join(', ')}`)
    return { valid: false, errors }
  }

  // Validar que hay al menos una fila de datos
  const dataLines = lines.slice(1)
  let validProductCount = 0

  for (let i = 0; i < dataLines.length; i++) {
    const cells = delimiter === ',' ? parseCSVLine(dataLines[i]) : dataLines[i].split(';')
    const nameIndex = normalizedHeaders.indexOf('name')

    if (nameIndex !== -1 && cells[nameIndex] && cells[nameIndex].trim() !== '') {
      validProductCount++
    }
  }

  if (validProductCount === 0) {
    errors.push('No se encontraron productos válidos. Verifica que la columna "name" tenga datos.')
    return { valid: false, errors }
  }

  return {
    valid: true,
    totalProducts: validProductCount,
    headers: normalizedHeaders
  }
}

/**
 * Lee un archivo como texto
 * @param {File} file - Archivo a leer
 * @returns {Promise<string>} Contenido del archivo
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/**
 * Valida que un archivo sea CSV válido
 * @param {File} file - Archivo a validar
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No se ha seleccionado ningún archivo' }
  }

  const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
  const validExtensions = ['.csv', '.txt']

  const hasValidType = validTypes.includes(file.type)
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

  if (!hasValidType && !hasValidExtension) {
    return {
      valid: false,
      error: 'El archivo debe ser CSV (.csv o .txt)'
    }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 10MB`
    }
  }

  return { valid: true }
}

/**
 * Descarga una plantilla CSV de ejemplo
 */
export function downloadCSVTemplate() {
  const template = `name,description,category,price,cost,sku,barcode,stock,min_stock,unit,type,expiry_date,supplier,notes
Producto Ejemplo 1,Descripción del producto,Categoría 1,100,50,SKU001,7890123456789,100,10,kg,unit,,Proveedor 1,Notas opcionales
Producto Ejemplo 2,Otro producto,Categoría 2,200,100,SKU002,,50,5,lb,weight-price,,Proveedor 2,
`

  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', 'plantilla_productos.csv')
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
