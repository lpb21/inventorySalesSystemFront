import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  afterEach(() => {
    cleanup()
    document.querySelectorAll('.swal2-container').forEach(el => el.remove())
  })

  it('respeta el autoFocus de un campo en vez de enfocar la X', () => {
    const { getByTestId } = render(
      <Modal onClose={vi.fn()} title="Seleccionar Cliente">
        <button className="modal-close">X</button>
        <input data-testid="otro" />
        <input data-testid="buscador" autoFocus />
      </Modal>
    )

    expect(document.activeElement).toBe(getByTestId('buscador'))
  })

  it('sin autoFocus enfoca el primer control que no es el botón de cierre', () => {
    const { getByTestId } = render(
      <Modal onClose={vi.fn()} title="Nuevo Producto">
        <button className="modal-close">X</button>
        <input data-testid="nombre" />
        <button>Guardar</button>
      </Modal>
    )

    expect(document.activeElement).toBe(getByTestId('nombre'))
  })

  it('si el único control es la X, la enfoca', () => {
    const { getByTestId } = render(
      <Modal onClose={vi.fn()} title="Aviso">
        <button className="modal-close" data-testid="cerrar">X</button>
      </Modal>
    )

    expect(document.activeElement).toBe(getByTestId('cerrar'))
  })

  it('Escape cierra el modal', () => {
    const onClose = vi.fn()
    render(<Modal onClose={onClose} title="t"><button>ok</button></Modal>)

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape no cierra el modal si dismissible es false', () => {
    const onClose = vi.fn()
    render(<Modal onClose={onClose} title="t" dismissible={false}><button>ok</button></Modal>)

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('con dos modales anidados, Escape cierra solo el de arriba', () => {
    const closeParent = vi.fn()
    const closeChild = vi.fn()
    render(
      <>
        <Modal onClose={closeParent} title="padre"><button>a</button></Modal>
        <Modal onClose={closeChild} title="hijo"><button>b</button></Modal>
      </>
    )

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(closeChild).toHaveBeenCalledTimes(1)
    expect(closeParent).not.toHaveBeenCalled()
  })

  // Regresión: la confirmación de "¿Borrar receta?" se abre encima de
  // RecipeManagerModal. Escape cerraba el modal de atrás y la alerta nunca
  // recibía la tecla.
  it('con una alerta de SweetAlert encima, le deja el teclado a la alerta', () => {
    const onClose = vi.fn()
    render(<Modal onClose={onClose} title="Recetas de Despiece"><button>a</button></Modal>)

    const swal = document.createElement('div')
    swal.className = 'swal2-container'
    swal.innerHTML = '<button class="swal2-confirm">Sí, borrar</button>'
    document.body.appendChild(swal)
    const confirm = swal.querySelector('button')
    confirm.focus()
    const alertKeydown = vi.fn()
    swal.addEventListener('keydown', alertKeydown)

    fireEvent.keyDown(confirm, { key: 'Escape' })
    fireEvent.keyDown(confirm, { key: 'Tab' })

    expect(onClose).not.toHaveBeenCalled()
    expect(alertKeydown).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(confirm)
  })
})
