import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

const addToast = vi.fn()

vi.mock('../../context/GlobalContext', () => ({
  useGlobalContext: () => ({ currentUser: { role: 'owner' }, addToast }),
}))

vi.mock('../../api/config', () => ({
  productsAPI: { lookupBarcode: vi.fn() },
}))

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

import { productsAPI } from '../../api/config'
import ProductModal from './ProductModal'

const categories = [{ id: 'cat-1', name: 'Bebidas' }]

beforeAll(() => {
  // jsdom no implementa object URLs
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
  globalThis.URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

function renderModal(props = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(
    <ProductModal
      categories={categories}
      onSave={onSave}
      onClose={vi.fn()}
      {...props}
    />
  )
  return { onSave }
}

const barcodeInput = () => screen.getByPlaceholderText('Ej: 7501234567890')
const nameInput = () => screen.getByPlaceholderText('Ej: Manzana Roja')

describe('ProductModal — búsqueda por código de barras (Open Food Facts)', () => {
  it('Enter del lector busca en OFF, NO envía el formulario y autocompleta el nombre', async () => {
    productsAPI.lookupBarcode.mockResolvedValue({
      found: true,
      barcode: '7702004003508',
      name: 'Gaseosa sabor cola',
      imageUrl: 'https://images.openfoodfacts.org/x/front.jpg',
      sourceUrl: 'https://world.openfoodfacts.org/product/7702004003508',
    })
    const { onSave } = renderModal()

    fireEvent.change(barcodeInput(), { target: { value: '7702004003508' } })
    await act(async () => {
      fireEvent.keyDown(barcodeInput(), { key: 'Enter' })
    })

    expect(productsAPI.lookupBarcode).toHaveBeenCalledWith('7702004003508')
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(nameInput()).toHaveValue('Gaseosa sabor cola'))
    expect(screen.getByAltText('Vista previa del producto'))
      .toHaveAttribute('src', 'https://images.openfoodfacts.org/x/front.jpg')
    expect(screen.getByText(/se guardará automáticamente/i)).toBeInTheDocument()
    expect(screen.getByText('Open Food Facts contributors'))
      .toHaveAttribute('href', 'https://world.openfoodfacts.org/product/7702004003508')
  })

  it('no pisa un nombre que el usuario ya escribió', async () => {
    productsAPI.lookupBarcode.mockResolvedValue({ found: true, barcode: '7702004003508', name: 'Otro nombre' })
    renderModal()

    fireEvent.change(nameInput(), { target: { value: 'Mi gaseosa' } })
    fireEvent.change(barcodeInput(), { target: { value: '7702004003508' } })
    await act(async () => {
      fireEvent.blur(barcodeInput())
    })

    expect(nameInput()).toHaveValue('Mi gaseosa')
  })

  it('códigos internos (no EAN/UPC) no consultan OFF', async () => {
    renderModal()

    fireEvent.change(barcodeInput(), { target: { value: 'PAPA-KG' } })
    await act(async () => {
      fireEvent.blur(barcodeInput())
    })

    expect(productsAPI.lookupBarcode).not.toHaveBeenCalled()
  })

  it('si OFF falla, el formulario sigue normal', async () => {
    productsAPI.lookupBarcode.mockRejectedValue(new Error('HTTP 500'))
    renderModal()

    fireEvent.change(barcodeInput(), { target: { value: '7702004003508' } })
    await act(async () => {
      fireEvent.blur(barcodeInput())
    })

    expect(screen.queryByAltText('Vista previa del producto')).not.toBeInTheDocument()
    expect(nameInput()).toHaveValue('')
  })

  it('el mismo código no se consulta dos veces', async () => {
    productsAPI.lookupBarcode.mockResolvedValue({ found: false, barcode: '7702004003508', reason: 'not_found' })
    renderModal()

    fireEvent.change(barcodeInput(), { target: { value: '7702004003508' } })
    await act(async () => { fireEvent.blur(barcodeInput()) })
    await act(async () => { fireEvent.blur(barcodeInput()) })

    expect(productsAPI.lookupBarcode).toHaveBeenCalledTimes(1)
  })
})

describe('ProductModal — guardar', () => {
  const fillRequired = () => {
    fireEvent.change(nameInput(), { target: { value: 'Gaseosa' } })
  }

  it('la imagen nunca viaja en el JSON del producto', async () => {
    const product = {
      id: 'p1', name: 'Gaseosa', category_id: 'cat-1', unit: 'und', type: 'unit',
      price: 3000, cost: 2000, stock: 5, min_stock: 1,
      image_url: 'https://cdn.test/p1.webp?v=1', image_source: 'user', image_source_ref: null,
    }
    const { onSave } = renderModal({ product })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar/i }))
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    const [payload, imageChanges] = onSave.mock.calls[0]
    expect(payload).not.toHaveProperty('image_url')
    expect(payload).not.toHaveProperty('image_source')
    expect(payload).not.toHaveProperty('image_source_ref')
    expect(payload).not.toHaveProperty('skip_image_lookup')
    expect(imageChanges).toEqual({ imageFile: null, removeImage: false })
  })

  it('con foto elegida: la pasa al padre y pide al backend no buscar en OFF', async () => {
    const { onSave } = renderModal()
    fillRequired()

    const file = new File(['img'], 'foto.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(screen.getByTestId('product-image-input'), { target: { files: [file] } })
    })

    expect(screen.getByAltText('Vista previa del producto')).toHaveAttribute('src', 'blob:preview')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar/i }))
    })

    const [payload, imageChanges] = onSave.mock.calls[0]
    expect(payload.skip_image_lookup).toBe(true)
    expect(imageChanges.imageFile).toBeInstanceOf(File)
    expect(imageChanges.removeImage).toBe(false)
  })

  it('rechaza tipos no permitidos con un mensaje', async () => {
    renderModal()

    const pdf = new File(['%PDF'], 'factura.pdf', { type: 'application/pdf' })
    await act(async () => {
      fireEvent.change(screen.getByTestId('product-image-input'), { target: { files: [pdf] } })
    })

    expect(screen.getByText(/Solo se permiten imágenes JPG, PNG o WebP/)).toBeInTheDocument()
    expect(screen.queryByAltText('Vista previa del producto')).not.toBeInTheDocument()
  })

  it('en edición, "Quitar" marca la imagen para borrarla al guardar', async () => {
    const product = {
      id: 'p1', name: 'Gaseosa', category_id: 'cat-1', unit: 'und', type: 'unit',
      price: 3000, cost: 2000, stock: 5, min_stock: 1,
      image_url: 'https://cdn.test/p1.webp?v=1', image_source: 'user',
    }
    const { onSave } = renderModal({ product })

    fireEvent.click(screen.getByRole('button', { name: /Quitar/i }))
    expect(screen.getByText(/se quitará al guardar/i)).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar/i }))
    })

    expect(onSave.mock.calls[0][1]).toEqual({ imageFile: null, removeImage: true })
  })
})

describe('ProductModal — "Buscar imagen" (edición)', () => {
  const product = {
    id: 'p1', name: 'Gaseosa', category_id: 'cat-1', unit: 'und', type: 'unit',
    price: 3000, cost: 2000, stock: 5, min_stock: 1, barcode: '7702004003508',
    image_url: null, image_source: null,
  }

  it('llama al backend, muestra el resultado y la atribución', async () => {
    const onSearchImage = vi.fn().mockResolvedValue({
      status: 'updated',
      product: {
        ...product,
        image_url: 'https://cdn.test/p1.webp?v=2',
        image_source: 'off',
        image_source_ref: 'https://world.openfoodfacts.org/product/7702004003508',
      },
    })
    renderModal({ product, onSearchImage })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buscar imagen/i }))
    })

    expect(onSearchImage).toHaveBeenCalledWith('p1')
    expect(addToast).toHaveBeenCalledWith('Imagen encontrada en Open Food Facts', 'success')
    expect(screen.getByAltText('Vista previa del producto')).toHaveAttribute('src', 'https://cdn.test/p1.webp?v=2')
    expect(screen.getByText('Open Food Facts contributors')).toBeInTheDocument()
  })

  it('no se ofrece sin código de barras válido', () => {
    renderModal({ product: { ...product, barcode: '' }, onSearchImage: vi.fn() })

    expect(screen.queryByRole('button', { name: /Buscar imagen/i })).not.toBeInTheDocument()
  })

  it('no se ofrece al crear (el backend la busca solo tras guardar)', () => {
    renderModal({ onSearchImage: vi.fn() })

    expect(screen.queryByRole('button', { name: /Buscar imagen/i })).not.toBeInTheDocument()
  })

  it('si el código cambió sin guardar, pide guardar primero', async () => {
    const onSearchImage = vi.fn()
    renderModal({ product, onSearchImage })

    fireEvent.change(barcodeInput(), { target: { value: '7702004003591' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buscar imagen/i }))
    })

    expect(onSearchImage).not.toHaveBeenCalled()
    expect(screen.getByText(/Guarda primero el producto/)).toBeInTheDocument()
  })
})
