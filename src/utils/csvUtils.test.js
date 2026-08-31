import { describe, it, expect } from 'vitest'
import { parseCSVLine, normalizeHeader } from './csvUtils'

describe('csvUtils - parseCSVLine', () => {
  it('separa una línea simple por comas', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('recorta espacios de cada campo', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('respeta las comas dentro de comillas', () => {
    // "Pechuga, deshuesada" es UN solo campo, no dos
    expect(parseCSVLine('"Pechuga, deshuesada",15000')).toEqual(['Pechuga, deshuesada', '15000'])
  })

  it('maneja campos vacíos', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })
})

describe('csvUtils - normalizeHeader', () => {
  it('traduce nombres en español a las claves internas', () => {
    expect(normalizeHeader('nombre')).toBe('name')
    expect(normalizeHeader('precio')).toBe('price')
    expect(normalizeHeader('costo')).toBe('cost')
  })

  it('normaliza a minúsculas', () => {
    expect(normalizeHeader('NOMBRE')).toBe('name')
    expect(normalizeHeader('Precio')).toBe('price')
  })

  it('maneja tildes en las cabeceras', () => {
    expect(normalizeHeader('categoría')).toBe('category')
    expect(normalizeHeader('código')).toBe('sku')
  })

  it('quita comillas alrededor de la cabecera', () => {
    expect(normalizeHeader('"nombre"')).toBe('name')
  })

  it('devuelve la cabecera tal cual si no tiene alias', () => {
    expect(normalizeHeader('desconocido')).toBe('desconocido')
  })
})