import { describe, it, expect } from 'vitest'
import {
  normalizeLookupBarcode,
  validateImageFile,
  computeTargetSize,
  compressImageFile,
  isOpenFoodFactsImage,
  imageAttributionTitle,
  lookupResultMessage,
  apiErrorMessage,
  MAX_UPLOAD_BYTES,
} from './productImage'

const fakeFile = (type, size = 1000, name = 'foto.jpg') => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('normalizeLookupBarcode', () => {
  it('acepta EAN/UPC de 8 a 14 dígitos y limpia espacios y guiones', () => {
    expect(normalizeLookupBarcode('7702004003508')).toBe('7702004003508')
    expect(normalizeLookupBarcode(' 7702004-003508 ')).toBe('7702004003508')
    expect(normalizeLookupBarcode('12345670')).toBe('12345670')
  })

  it('rechaza códigos internos, cortos, largos o vacíos', () => {
    expect(normalizeLookupBarcode('TOMATE-01')).toBeNull()
    expect(normalizeLookupBarcode('1234567')).toBeNull()
    expect(normalizeLookupBarcode('123456789012345')).toBeNull()
    expect(normalizeLookupBarcode('')).toBeNull()
    expect(normalizeLookupBarcode(null)).toBeNull()
  })
})

describe('validateImageFile', () => {
  it('acepta JPG, PNG y WebP', () => {
    expect(validateImageFile(fakeFile('image/jpeg')).valid).toBe(true)
    expect(validateImageFile(fakeFile('image/png')).valid).toBe(true)
    expect(validateImageFile(fakeFile('image/webp')).valid).toBe(true)
  })

  it('rechaza otros tipos (PDF, GIF, HEIC)', () => {
    expect(validateImageFile(fakeFile('application/pdf')).valid).toBe(false)
    expect(validateImageFile(fakeFile('image/gif')).valid).toBe(false)
    expect(validateImageFile(fakeFile('image/heic')).valid).toBe(false)
  })

  it('rechaza archivos exageradamente grandes antes de comprimir', () => {
    const result = validateImageFile(fakeFile('image/jpeg', MAX_UPLOAD_BYTES * 4 + 1))
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/demasiado grande/i)
  })

  it('sin archivo no es válido', () => {
    expect(validateImageFile(null).valid).toBe(false)
  })
})

describe('computeTargetSize', () => {
  it('reduce al máximo conservando la proporción', () => {
    expect(computeTargetSize(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
    expect(computeTargetSize(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 })
  })

  it('no agranda imágenes pequeñas', () => {
    expect(computeTargetSize(600, 400, 1024)).toEqual({ width: 600, height: 400 })
  })

  it('dimensiones inválidas devuelven 0', () => {
    expect(computeTargetSize(0, 400)).toEqual({ width: 0, height: 0 })
  })
})

describe('compressImageFile', () => {
  it('si el navegador no puede decodificar, devuelve el archivo original (el servidor la normaliza)', async () => {
    const file = fakeFile('image/jpeg', 2000)
    const result = await compressImageFile(file)
    expect(result).toBe(file)
  })
})

describe('atribución de Open Food Facts', () => {
  it('solo las imágenes con image_source "off" llevan atribución', () => {
    expect(isOpenFoodFactsImage({ image_source: 'off' })).toBe(true)
    expect(isOpenFoodFactsImage({ image_source: 'user' })).toBe(false)
    expect(isOpenFoodFactsImage(null)).toBe(false)

    expect(imageAttributionTitle({ image_source: 'off' })).toMatch(/Open Food Facts.*CC BY-SA/)
    expect(imageAttributionTitle({ image_source: 'user' })).toBeUndefined()
  })
})

describe('lookupResultMessage', () => {
  it('traduce cada estado del backend a un mensaje para el usuario', () => {
    expect(lookupResultMessage({ status: 'updated' }).type).toBe('success')
    expect(lookupResultMessage({ status: 'not_found' }).message).toMatch(/No se encontró/)
    expect(lookupResultMessage({ status: 'unavailable' }).message).toMatch(/no está disponible/)
    expect(lookupResultMessage({ status: 'skipped', reason: 'no_barcode' }).message).toMatch(/código de barras válido/)
    expect(lookupResultMessage({ status: 'skipped', reason: 'storage_not_configured' }).type).toBe('error')
    expect(lookupResultMessage(undefined).type).toBe('error')
  })
})

describe('apiErrorMessage', () => {
  it('usa el mensaje del backend si existe', () => {
    const error = { response: { data: { error: { message: 'La imagen supera el tamaño máximo de 5MB' } } } }
    expect(apiErrorMessage(error)).toBe('La imagen supera el tamaño máximo de 5MB')
  })

  it('usa el mensaje por defecto si no hay respuesta', () => {
    expect(apiErrorMessage(new Error('x'), 'Falló')).toBe('Falló')
  })
})
