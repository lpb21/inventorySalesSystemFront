# Imágenes de productos — estado del desarrollo (EN PAUSA)

> **Estado:** desarrollo completo pero **NO integrado ni desplegado**. Queda aparcado en la rama
> `feat/product-images` hasta que el volumen de usuarios justifique el costo de S3 + CloudFront.
> **No hacer merge a `invSalesFrontEnd` todavía.** Depende de la rama `feat/product-images` del backend.

**Documento completo** (qué incluye, costos, alternativas sin CloudFront, cómo retomar y despliegue):
`inventorySalesSystemBack` → rama `feat/product-images` → `FEATURE_PRODUCT_IMAGES_STATUS.md`
(y `PRODUCT_IMAGES.md` para el contrato de la API).

## Qué incluye este repo (commit `5a64007`)

| Archivo | Qué es |
|---|---|
| `src/components/inventory/ProductModal.jsx` | Subir/quitar foto, vista previa y nombre desde Open Food Facts al escanear, "Buscar imagen" |
| `src/components/inventory/ProductImageField.jsx` | UI del campo de imagen + atribución CC BY-SA |
| `src/components/shared/ProductImage.jsx` | Imagen en tarjetas del POS e inventario (contain, lazy, fallback al ícono) |
| `src/components/inventory/InventoryView.jsx`, `src/components/sales/ProductGrid.jsx` | Integración |
| `src/api/config.js`, `src/hooks/queries/useProducts.js` | `lookupBarcode`, `uploadImage`, `deleteImage`, `lookupImage` |
| `src/utils/productImage.js` | Validación, compresión en navegador (1024px), mensajes, atribución |
| `*.test.js(x)` | `utils/productImage`, `ProductImage`, `ProductModal` (sin ejecutar) |

Cambio de comportamiento: en "Código de Barras", **Enter ya no envía el formulario**; dispara la
búsqueda en Open Food Facts (los lectores de código envían Enter al final).

La CSP del build (`vite.config.js`) ya permite `img-src https: blob:`; no requiere cambios.

## Cómo retomar

```bash
git checkout feat/product-images && git fetch origin && git merge origin/invSalesFrontEnd
npm ci && npm run test:run
```

Desplegar el front **solo después** del backend (endpoints, migración y S3 configurados).
