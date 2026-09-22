import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CategoryModal from './CategoryModal'

// Regresión: el modal debe recibir la categoría por la prop `category`.
// Si SettingsView (u otro consumidor) la pasa con otro nombre, el modal abre
// en modo "crear" y guarda con id undefined -> PUT /categories/undefined 400.
describe('CategoryModal', () => {
  const category = { id: 'cat-123', name: 'Embutidos', description: '', icon: 'package' }

  it('en modo edición muestra el título y el nombre precargado', () => {
    render(<CategoryModal category={category} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('Editar Categoría')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Embutidos')).toBeInTheDocument()
  })

  // Timeout ampliado (default 5000): tras el submit, handleSubmit espera
  // `await onSave(...)` y tanto ese estado de loading como su reversión en el
  // finally fuerzan un re-render del grid de 77 iconos con SVG (lucide-react).
  // Confirmado en corridas reales de la suite completa: este test puntual
  // llegó a tardar 15191ms por esa reconstrucción bajo carga, mientras los
  // otros dos del mismo archivo (un solo render, sin ese re-render) tardan 2-3s.
  it('al guardar en edición envía el id de la categoría', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<CategoryModal category={category} onSave={onSave} onClose={vi.fn()} />)

    // Hay que esperar dentro de act() a que la continuación post-await de
    // handleSubmit termine; si no, React advierte "not wrapped in act".
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }))
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-123', name: 'Embutidos' })
    )
  }, 20000)

  it('sin categoría abre en modo crear (sin id)', () => {
    render(<CategoryModal onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Nueva Categoría')).toBeInTheDocument()
  })
})