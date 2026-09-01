import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductGrid from './ProductGrid'

// Productos de ejemplo para los tests
const mockProducts = [
  {
    id: 'p1',
    name: 'Pollo Campesino',
    price: 25000,
    stock: 65,
    unit: 'lb',
    type: 'weight',
    min_stock: 10,
    category: { name: 'Pollo' },
  },
  {
    id: 'p2',
    name: 'Gaseosa',
    price: 3000,
    stock: 5,
    unit: 'und',
    type: 'unit',
    min_stock: 2,
    category: { name: 'Bebidas' },
  },
]

describe('ProductGrid', () => {
  it('renderiza todos los productos de la lista', () => {
    render(<ProductGrid products={mockProducts} onAddToCart={() => {}} />)

    expect(screen.getByText('Pollo Campesino')).toBeInTheDocument()
    expect(screen.getByText('Gaseosa')).toBeInTheDocument()
  })

  it('muestra el stock de cada producto', () => {
    render(<ProductGrid products={mockProducts} onAddToCart={() => {}} />)

    // Hay un "Stock:" por cada producto (usamos getAllByText porque son varios)
    const stockLabels = screen.getAllByText(/Stock:/)
    expect(stockLabels).toHaveLength(2)

    // Y verificamos que los valores de stock aparecen
    expect(screen.getByText(/65/)).toBeInTheDocument()  // el 65 es único
  })

  it('llama a onAddToCart con el producto al hacer clic en una tarjeta', () => {
    const onAddToCart = vi.fn()  // función espía
    render(<ProductGrid products={mockProducts} onAddToCart={onAddToCart} />)

    // Hacer clic en la tarjeta del Pollo (clic en su nombre, que está dentro de la card)
    fireEvent.click(screen.getByText('Pollo Campesino'))

    // Verificar que se llamó con el producto correcto
    expect(onAddToCart).toHaveBeenCalledTimes(1)
    expect(onAddToCart).toHaveBeenCalledWith(mockProducts[0])
  })

  it('renderiza una grilla vacía sin productos', () => {
    const { container } = render(<ProductGrid products={[]} onAddToCart={() => {}} />)

    // No debe haber ninguna tarjeta de producto
    const cards = container.querySelectorAll('.product-card')
    expect(cards).toHaveLength(0)
  })

  it('muestra el precio del producto', () => {
    render(<ProductGrid products={mockProducts} onAddToCart={() => {}} />)

    // La gaseosa (producto por unidad) muestra su precio directo
    expect(screen.getByText(/3,000/)).toBeInTheDocument()
  })
})