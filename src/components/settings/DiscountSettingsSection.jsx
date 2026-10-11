import { useEffect, useState } from 'react'
import { Percent, Plus, Save, X } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { tenantAPI, setUser } from '../../api/config'
import { getDiscountSettings, normalizeDiscountPercent, MAX_DISCOUNT_PRESETS } from '../../utils/discounts'

const sortPresets = (presets) => [...presets].sort((a, b) => a - b)
const sameSettings = (a, b) => a.mode === b.mode && a.presets.join('|') === b.presets.join('|')

/**
 * Cómo se ingresan los descuentos por línea en el punto de venta:
 * botones con porcentajes fijos o un campo para escribir el porcentaje.
 * La editan el propietario y el administrador.
 */
export default function DiscountSettingsSection() {
  const { currentUser, setCurrentUser, addToast } = useGlobalContext()
  const tenant = currentUser?.tenant
  const canEdit = ['owner', 'admin'].includes(currentUser?.role) && !!tenant

  const saved = getDiscountSettings(tenant)
  const savedPresets = sortPresets(saved.presets)
  const [mode, setMode] = useState(saved.mode)
  const [presets, setPresets] = useState(savedPresets)
  const [newPreset, setNewPreset] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setMode(saved.mode)
    setPresets(savedPresets)
  }, [saved.mode, savedPresets.join('|')])

  if (!tenant) return null

  const changed = !sameSettings({ mode, presets }, { mode: saved.mode, presets: savedPresets })

  const handleAddPreset = (e) => {
    e.preventDefault()
    const value = normalizeDiscountPercent(newPreset)
    if (value <= 0) {
      addToast('Escribe un porcentaje entre 0 y 100', 'warning')
      return
    }
    if (presets.includes(value)) {
      addToast(`El ${value}% ya está en la lista`, 'warning')
      return
    }
    setPresets(sortPresets([...presets, value]))
    setNewPreset('')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await tenantAPI.updateDiscountSettings({
        discount_mode: mode,
        discount_presets: presets,
      })
      // El punto de venta lee la configuración de la sesión: se refleja sin volver a iniciar sesión
      const nextUser = {
        ...currentUser,
        tenant: {
          ...currentUser.tenant,
          discount_mode: updated?.discount_mode ?? mode,
          discount_presets: updated?.discount_presets ?? presets,
        },
      }
      setCurrentUser(nextUser)
      setUser(nextUser)
      addToast('Configuración de descuentos actualizada', 'success')
    } catch (error) {
      const apiError = error?.response?.data?.error
      const details = Array.isArray(apiError?.details) && apiError.details.length ? apiError.details.join(', ') : null
      addToast(details || apiError?.message || 'Error al guardar la configuración de descuentos', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Percent size={20} />
          <h3 className="card-title" style={{ marginBottom: 0 }}>Descuentos</h3>
        </div>
      </div>

      <div className="discount-settings-body">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 0 }}>
          Define cómo se elige el descuento de cada producto al vender. Los descuentos los aplican
          supervisores, administradores y el propietario; el cajero necesita que uno de ellos lo autorice.
        </p>

        <fieldset className="discount-mode-options" disabled={!canEdit}>
          <legend className="form-label">Forma de ingresar el descuento</legend>
          <label className="discount-mode-option">
            <input
              type="radio"
              name="discount-mode"
              checked={mode === 'fixed'}
              onChange={() => setMode('fixed')}
            />
            <span>
              <strong>Valores fijos</strong>
              <small>Botones con los porcentajes que definas.</small>
            </span>
          </label>
          <label className="discount-mode-option">
            <input
              type="radio"
              name="discount-mode"
              checked={mode === 'free'}
              onChange={() => setMode('free')}
            />
            <span>
              <strong>Valor libre</strong>
              <small>Un campo para escribir cualquier porcentaje.</small>
            </span>
          </label>
        </fieldset>

        <div className="form-group">
          <span className="form-label">Porcentajes fijos (máximo {MAX_DISCOUNT_PRESETS})</span>
          <div className="cart-discount-presets">
            {presets.map(preset => (
              <span key={preset} className="cart-discount-chip active discount-preset-chip">
                {preset}%
                {canEdit && presets.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Quitar ${preset}%`}
                    onClick={() => setPresets(presets.filter(p => p !== preset))}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
          {mode === 'free' && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
              Se usan solo si vuelves a valores fijos.
            </p>
          )}
        </div>

        {canEdit && presets.length < MAX_DISCOUNT_PRESETS && (
          <form onSubmit={handleAddPreset} className="discount-preset-form">
            <input
              type="number"
              className="form-input"
              min="0.01"
              max="100"
              step="0.01"
              inputMode="decimal"
              aria-label="Nuevo porcentaje"
              placeholder="Ej: 12"
              value={newPreset}
              onChange={(e) => setNewPreset(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" disabled={!newPreset}>
              <Plus size={16} />
              Agregar
            </button>
          </form>
        )}

        {canEdit ? (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !changed}
            title={changed ? 'Guardar la configuración de descuentos' : 'No hay cambios por guardar'}
          >
            <Save size={18} />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 0 }}>
            Solo el propietario o un administrador pueden cambiar esta configuración.
          </p>
        )}
      </div>
    </div>
  )
}
