import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomerDisplay from './CustomerDisplay'

// Regresión: la pantalla del comprador mostraba "Punto Fresco", un eslogan de
// salsamentaría y la dirección "Calle Principal #123" a todos los negocios.
describe('CustomerDisplay', () => {
  const business = { name: 'Carnes Don Pepe', address: 'Cra 10 # 20-30, Cali', phone: '3001234567' }

  it('muestra el nombre, la dirección y el teléfono del negocio en sesión', () => {
    render(<CustomerDisplay cart={[]} cartTotal={0} onClose={vi.fn()} business={business} />)

    expect(screen.getByText('Carnes Don Pepe')).toBeInTheDocument()
    expect(screen.getByText('Visítenos en Cra 10 # 20-30, Cali')).toBeInTheDocument()
    expect(screen.getByText('Tel: 3001234567')).toBeInTheDocument()
    expect(screen.queryByText(/Calle Principal/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Salsamentaría/)).not.toBeInTheDocument()
  })

  it('omite dirección y teléfono si el negocio no los cargó', () => {
    render(<CustomerDisplay cart={[]} cartTotal={0} onClose={vi.fn()} business={{ name: 'Carnes Don Pepe' }} />)

    expect(screen.queryByText(/Visítenos/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Tel:/)).not.toBeInTheDocument()
  })

  it('muestra los productos del carrito y el total', () => {
    const cart = [{ id: 1, name: 'Queso Campesino', price: 12000, quantity: 2, unit: 'und' }]
    render(<CustomerDisplay cart={cart} cartTotal={24000} onClose={vi.fn()} business={business} />)

    expect(screen.getByText('Queso Campesino')).toBeInTheDocument()
    expect(screen.getAllByText(`$${(24000).toLocaleString()}`).length).toBeGreaterThan(0)
  })
})
