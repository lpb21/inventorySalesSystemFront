import { useRef } from 'react'
import { Camera, Trash2, Search, ImageOff } from 'lucide-react'
import { OFF_ATTRIBUTION } from '../../utils/productImage'

/**
 * ProductImageField — vista previa y acciones de la imagen dentro del formulario de producto.
 * Es solo presentación: el estado (archivo pendiente, quitar, sugerencia) vive en ProductModal.
 */
function ProductImageField({
  previewUrl,
  showAttribution,
  attributionUrl,
  suggestionNote,
  canRemove,
  canSearch,
  searching,
  disabled,
  error,
  onPickFile,
  onRemove,
  onSearch,
}) {
  const inputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    // Permite volver a elegir el mismo archivo después de quitarlo
    e.target.value = ''
    if (file) onPickFile(file)
  }

  return (
    <div className="form-group">
      <label className="form-label">Imagen</label>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '96px',
            height: '96px',
            flexShrink: 0,
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: previewUrl ? '#ffffff' : 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            color: 'var(--text-secondary)',
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa del producto"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <ImageOff size={28} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              <Camera size={16} /> {previewUrl ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {canSearch && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onSearch}
                disabled={disabled || searching}
                title="Buscar imagen por código de barras en Open Food Facts"
              >
                <Search size={16} /> {searching ? 'Buscando...' : 'Buscar imagen'}
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onRemove}
                disabled={disabled}
              >
                <Trash2 size={16} /> Quitar
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            data-testid="product-image-input"
          />

          {suggestionNote && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{suggestionNote}</span>
          )}

          {showAttribution && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {attributionUrl ? (
                <>
                  Imagen:{' '}
                  <a href={attributionUrl} target="_blank" rel="noopener noreferrer">
                    Open Food Facts contributors
                  </a>
                </>
              ) : (
                OFF_ATTRIBUTION.text
              )}{' '}
              ·{' '}
              <a href={OFF_ATTRIBUTION.licenseUrl} target="_blank" rel="noopener noreferrer">
                {OFF_ATTRIBUTION.license}
              </a>
            </span>
          )}

          {error && (
            <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductImageField
