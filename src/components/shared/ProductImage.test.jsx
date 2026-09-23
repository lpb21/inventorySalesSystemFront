import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductImage from './ProductImage'

const FallbackIcon = () => <span data-testid="fallback-icon" />

describe('ProductImage', () => {
  it('sin image_url muestra el ícono de la categoría', () => {
    render(<ProductImage product={{ name: 'Tomate' }} fallbackIcon={FallbackIcon} />)

    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('con image_url muestra la imagen con carga diferida', () => {
    render(
      <ProductImage
        product={{ name: 'Gaseosa', image_url: 'https://cdn.test/p1.webp?v=1' }}
        fallbackIcon={FallbackIcon}
      />
    )

    const img = screen.getByRole('img', { name: 'Gaseosa' })
    expect(img).toHaveAttribute('src', 'https://cdn.test/p1.webp?v=1')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('si la imagen no carga, vuelve al ícono', () => {
    render(
      <ProductImage
        product={{ name: 'Gaseosa', image_url: 'https://roto.test/x.jpg' }}
        fallbackIcon={FallbackIcon}
      />
    )

    fireEvent.error(screen.getByRole('img', { name: 'Gaseosa' }))

    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument()
  })

  it('las imágenes de Open Food Facts llevan la atribución en el title', () => {
    render(
      <ProductImage
        product={{ name: 'Leche', image_url: 'https://cdn.test/p2.webp', image_source: 'off' }}
        fallbackIcon={FallbackIcon}
      />
    )

    expect(screen.getByRole('img', { name: 'Leche' }).getAttribute('title')).toMatch(/Open Food Facts.*CC BY-SA/)
  })

  it('las fotos propias no llevan atribución', () => {
    render(
      <ProductImage
        product={{ name: 'Pan', image_url: 'https://cdn.test/p3.webp', image_source: 'user' }}
        fallbackIcon={FallbackIcon}
      />
    )

    expect(screen.getByRole('img', { name: 'Pan' })).not.toHaveAttribute('title')
  })
})
