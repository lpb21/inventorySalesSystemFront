import { useState, useEffect } from 'react'
import { X, Plus, Save } from 'lucide-react'
import Swal from 'sweetalert2'
import { useGlobalContext } from '../../context/GlobalContext'
import { can } from '../../utils/permissions'
import { productsAPI } from '../../api/config'
import {
  MAX_UPLOAD_BYTES,
  normalizeLookupBarcode,
  validateImageFile,
  compressImageFile,
  lookupResultMessage,
  apiErrorMessage,
} from '../../utils/productImage'
import ProductImageField from './ProductImageField'

const isHttpsUrl = (url) => typeof url === 'string' && url.startsWith('https://')
 
/**
 * onSave(data, { imageFile, removeImage }): el padre guarda el producto y luego aplica
 * los cambios de imagen con los endpoints dedicados (la imagen nunca viaja en el JSON).
 * onSearchImage(id): búsqueda manual en Open Food Facts (solo edición); devuelve { status, reason, product }.
 */
function ProductModal({ product, categories, suppliers = [], onSave, onClose, onAddCategory, onAddSupplier, onSearchImage }) {
  const { currentUser, addToast } = useGlobalContext()
  const canManageCategories = can(currentUser, 'canManageCategories')
  const canManageSuppliers = can(currentUser, 'canManageSuppliers')
  const [formData, setFormData] = useState(product
    ? {
        ...product,
        price: product.price ?? '',
        cost: product.cost ?? '',
        stock: product.stock ?? '',
        min_stock: product.min_stock ?? '',
        description: product.description ?? '',
        barcode: product.barcode ?? '',
        expiry_date: product.expiry_date ?? '',
        supplier_id: product.supplier_id ?? ''
      }
    : {
        name: '',
        description: '',
        barcode: '',
        category_id: categories[0]?.id || '',
        supplier_id: '',
        price: '',
        cost: '',
        stock: '',
        min_stock: '',
        unit: 'lb',
        type: 'weight',
        is_active: true,
        expiry_date: ''
      })
 
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // --- Imagen ---
  const isEdit = Boolean(product)
  const [imageProduct, setImageProduct] = useState(product || null) // campos de imagen vigentes en el backend
  const [imageFile, setImageFile] = useState(null)                   // foto elegida, se sube al guardar
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)              // quitar al guardar
  const [imageError, setImageError] = useState(null)
  const [suggestion, setSuggestion] = useState(null)                 // vista previa de Open Food Facts
  const [lastLookup, setLastLookup] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [searchingImage, setSearchingImage] = useState(false)

  // Libera la URL temporal de la vista previa al cambiarla o al cerrar el modal
  useEffect(() => () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
  }, [filePreviewUrl])

  const currentImageUrl = removeImage ? null : (imageProduct?.image_url || null)
  // La sugerencia solo se promete si el backend la va a guardar (sin imagen y no quitada a propósito)
  const showingSuggestion = !filePreviewUrl && !currentImageUrl && !removeImage
    && imageProduct?.image_source !== 'none' && Boolean(suggestion?.imageUrl)
  const previewUrl = filePreviewUrl || currentImageUrl || (showingSuggestion ? suggestion.imageUrl : null)
  const showAttribution = !filePreviewUrl
    && (showingSuggestion || (Boolean(currentImageUrl) && imageProduct?.image_source === 'off'))
  const attributionUrl = showingSuggestion ? suggestion.sourceUrl : imageProduct?.image_source_ref
  const lookupCode = normalizeLookupBarcode(formData.barcode)

  let suggestionNote = null
  if (lookingUp) suggestionNote = 'Buscando en Open Food Facts...'
  else if (showingSuggestion) suggestionNote = 'Imagen sugerida por Open Food Facts: se guardará automáticamente con el producto.'
  else if (removeImage) suggestionNote = 'La imagen se quitará al guardar.'

  const handlePickFile = async (file) => {
    const check = validateImageFile(file)
    if (!check.valid) {
      setImageError(check.message)
      return
    }

    setImageError(null)
    const compressed = await compressImageFile(file)
    if (compressed.size > MAX_UPLOAD_BYTES) {
      setImageError('La imagen supera el tamaño máximo de 5MB')
      return
    }

    setImageFile(compressed)
    setFilePreviewUrl(URL.createObjectURL(compressed))
    setRemoveImage(false)
  }

  const handleRemoveImage = () => {
    setImageError(null)
    if (imageFile) {
      setImageFile(null)
      setFilePreviewUrl(null)
      return
    }
    if (currentImageUrl) setRemoveImage(true)
  }

  // Al escanear/escribir el código: vista previa y nombre desde Open Food Facts (no guarda nada)
  const handleBarcodeLookup = async () => {
    const code = normalizeLookupBarcode(formData.barcode)
    if (!code || code === lastLookup) return
    if (isEdit && currentImageUrl) return

    setLastLookup(code)
    setLookingUp(true)
    try {
      const result = await productsAPI.lookupBarcode(code)
      if (result?.found) {
        setSuggestion(result.imageUrl
          ? { barcode: code, imageUrl: result.imageUrl, sourceUrl: isHttpsUrl(result.sourceUrl) ? result.sourceUrl : null }
          : null)
        if (result.name) {
          setFormData(prev => (prev.name?.trim() ? prev : { ...prev, name: result.name }))
        }
      } else {
        setSuggestion(null)
      }
    } catch {
      // Sin conexión con OFF: el formulario sigue normal
      setSuggestion(null)
    } finally {
      setLookingUp(false)
    }
  }

  const handleBarcodeChange = (value) => {
    setFormData({ ...formData, barcode: value })
    if (suggestion && normalizeLookupBarcode(value) !== suggestion.barcode) {
      setSuggestion(null)
    }
  }

  // Botón "Buscar imagen" (edición): usa el código de barras guardado en el backend
  const handleSearchImage = async () => {
    if (!isEdit || !onSearchImage) return

    if (lookupCode !== normalizeLookupBarcode(product.barcode)) {
      setImageError('Guarda primero el producto con el nuevo código de barras')
      return
    }

    if (currentImageUrl && imageProduct?.image_source === 'user') {
      const confirm = await Swal.fire({
        title: '¿Reemplazar la foto actual?',
        text: 'Se reemplazará la foto que subiste por la de Open Food Facts, si se encuentra.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, buscar',
        cancelButtonText: 'Cancelar',
        background: '#1a1f2e',
        color: '#e6edf3',
      })
      if (!confirm.isConfirmed) return
    }

    setImageError(null)
    setSearchingImage(true)
    try {
      const result = await onSearchImage(product.id)
      const { type, message } = lookupResultMessage(result)
      addToast(message, type)
      if (result?.product) {
        setImageProduct(result.product)
        setRemoveImage(false)
      }
    } catch (error) {
      addToast(apiErrorMessage(error, 'No se pudo buscar la imagen'), 'error')
    } finally {
      setSearchingImage(false)
    }
  }


  const validarNombre = (nombre) => {
    if (typeof nombre !== 'string') {
      return { valid: false, message: 'El nombre debe ser un texto' }
    }
    const trimmedName = nombre.trim()
    if (!trimmedName) {
      return { valid: false, message: 'El nombre es obligatorio' }
    }
    if (trimmedName.length < 2) {
      return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' }
    }
    return { valid: true, message: '' }
  }

 
  const validarCodigoBarras = (numero) => {
    if (!numero) return { valid: true, message: '' } // Opcional
    
    const soloNumeros = numero.toString().replace(/\D/g, '');
    if (soloNumeros.length > 0 && soloNumeros.length < 7) {
      return { valid: false, message: 'El código debe tener al menos 7 dígitos numéricos' }
    }
    return { valid: true, message: '' }
  }
 
  const validarFechaVencimiento = (fecha) => {
    if (!fecha) return { valid: true, message: '' } // Opcional
 
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaSeleccionada = new Date(fecha)
    // Ajustar zona horaria si es necesario o simplemente comparar fechas
    fechaSeleccionada.setMinutes(fechaSeleccionada.getMinutes() + fechaSeleccionada.getTimezoneOffset())
    fechaSeleccionada.setHours(0, 0, 0, 0)
 
    if (fechaSeleccionada < hoy) {
      return { valid: false, message: 'La fecha debe ser posterior a hoy' }
    }
    return { valid: true, message: '' }
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
 
    // Validar campos
    const nameV = validarNombre(formData.name)
    const barcodeV = validarCodigoBarras(formData.barcode)
    const expiryV = validarFechaVencimiento(formData.expiry_date)
 
    const newErrors = {
      name: nameV.valid ? null : nameV.message,
      barcode: barcodeV.valid ? null : barcodeV.message,
      expiry_date: expiryV.valid ? null : expiryV.message
    }
 
    setErrors(newErrors)
 
    // Si hay algún error, no guardar
    if (Object.values(newErrors).some(err => err !== null)) {
      return
    }
 
    setIsSaving(true)
    try {
      // La imagen se gestiona con sus propios endpoints: no viaja en el JSON del producto
      const { image_url, image_source, image_source_ref, ...productFields } = formData
      await onSave({
        ...productFields,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        stock: parseFloat(formData.stock) || 0,
        min_stock: parseFloat(formData.min_stock) || 0,
        supplier_id: formData.supplier_id || null,
        // Con foto propia pendiente, que el backend no busque en Open Food Facts
        ...(imageFile && { skip_image_lookup: true })
      }, { imageFile, removeImage })
    } catch (error) {
      console.error('Error saving product:', error)
      // El error generalmente se maneja en el componente padre vía toasts,
      // pero detenemos el spinner aquí.
    } finally {
      setIsSaving(false)
    }
  }
 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre del Producto <span style={{color: 'var(--danger)'}}>*</span></label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Manzana Roja"
              />
              {errors.name && (
                <span style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.name}
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Descripcion</label>
              <textarea
                className="form-input"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripcion del producto"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Código de Barras</label>
              <input
                type="text"
                className={`form-input ${errors.barcode ? 'error' : ''}`}
                value={formData.barcode}
                onChange={e => handleBarcodeChange(e.target.value)}
                onBlur={handleBarcodeLookup}
                onKeyDown={e => {
                  // Los lectores de código de barras envían Enter al final: buscar en vez de guardar
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleBarcodeLookup()
                  }
                }}
                placeholder="Ej: 7501234567890"
              />
              {errors.barcode && (
                <span style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.barcode}
                </span>
              )}
            </div>
            <ProductImageField
              previewUrl={previewUrl}
              showAttribution={showAttribution}
              attributionUrl={isHttpsUrl(attributionUrl) ? attributionUrl : null}
              suggestionNote={suggestionNote}
              canRemove={Boolean(filePreviewUrl || currentImageUrl)}
              canSearch={isEdit && Boolean(onSearchImage) && Boolean(lookupCode) && !imageFile}
              searching={searchingImage}
              disabled={isSaving}
              error={imageError}
              onPickFile={handlePickFile}
              onRemove={handleRemoveImage}
              onSearch={handleSearchImage}
            />
            <div className="form-group">
              <label className="form-label">Fecha de Vencimiento</label>
              <input
                type="date"
                className={`form-input ${errors.expiry_date ? 'error' : ''}`}
                value={formData.expiry_date}
                onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
              />
              {errors.expiry_date && (
                <span style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.expiry_date}
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Categori­a</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ minWidth: 0 }}
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {canManageCategories && onAddCategory && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onAddCategory}
                    style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                  >
                    <Plus size={16} /> Nueva
                  </button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Proveedor</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ minWidth: 0 }}
                  value={formData.supplier_id}
                  onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
                {canManageSuppliers && onAddSupplier && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onAddSupplier}
                    style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                  >
                    <Plus size={16} /> Nuevo
                  </button>
                )}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Precio de Venta</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Precio de Costo</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select
                  className="form-select"
                  value={formData.unit}
                  onChange={e => {
                    const newUnit = e.target.value
                    const newType = (newUnit === 'und' || newUnit === 'paq') ? 'unit' : 'weight'
                    setFormData({ ...formData, unit: newUnit, type: newType })
                  }}
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="lb">Libras (lb)</option>
                  <option value="und">Unidad</option>
                  <option value="paq">Paquete</option>
                  <option value="lt">Litros (lt)</option>
                  <option value="gr">Gramos (gr)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Producto</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.type === 'weight' ? 'Por Peso' : 'Por Unidad'}
                  disabled
                  style={{ background: 'var(--surface)' }}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  {formData.type === 'weight' ? `Stock Actual (${formData.unit})` : 'Stock Actual'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  step={formData.type === 'weight' ? '0.001' : '1'}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {formData.type === 'weight' ? `Stock Mi­nimo (${formData.unit})` : 'Stock Mi­nimo'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.min_stock}
                  onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                  placeholder="0"
                  step={formData.type === 'weight' ? '0.001' : '1'}
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span style={{ 
                    width: '18px', 
                    height: '18px', 
                    border: '2px solid rgba(255,255,255,0.3)', 
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                    marginRight: '8px'
                  }} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
 
export default ProductModal