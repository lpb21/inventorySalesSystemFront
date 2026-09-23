import { useState } from 'react'
import { Package2 } from 'lucide-react'
import { imageAttributionTitle } from '../../utils/productImage'

/**
 * ProductImage — imagen del producto o, si no hay (o no carga), el ícono de su categoría.
 *
 * Las imágenes del backend son cuadradas con fondo blanco (WebP 512px), así que se
 * muestran con objectFit "contain" para no recortar el producto dentro de la tarjeta.
 */
function ProductImage({ product, fallbackIcon: FallbackIcon = Package2, iconSize = 48 }) {
  // Si la URL falla (p. ej. enlace externo roto), se recuerda para esa URL y se muestra el ícono
  const [failedUrl, setFailedUrl] = useState(null)
  const url = product?.image_url

  if (!url || failedUrl === url) {
    return <FallbackIcon size={iconSize} />
  }

  return (
    <img
      src={url}
      alt={product.name}
      title={imageAttributionTitle(product)}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(url)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#ffffff',
        borderRadius: '8px',
      }}
    />
  )
}

export default ProductImage
