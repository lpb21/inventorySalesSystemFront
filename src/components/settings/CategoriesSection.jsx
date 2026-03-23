import { Package, Edit, Plus, Ban, CheckCircle, RefreshCw } from 'lucide-react'
import { can } from '../../utils/permissions'
import { ICON_OPTIONS } from '../inventory/CategoryModal'

/**
 * Componente de la sección de Categorías en Settings
 */
function CategoriesSection({
  currentUser,
  categories,
  showInactive,
  onToggleShowInactive,
  onAddCategory,
  onEditCategory,
  onToggleStatus
}) {
  const canManageCategories = can(currentUser, 'canManageCategories')

  if (!canManageCategories) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Package size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Categorías
          </h3>
        </div>
        <div className="empty-state" style={{ padding: '40px' }}>
          <Ban size={48} />
          <h4>Sin permisos</h4>
          <p>No tienes permisos para gestionar categorías</p>
        </div>
      </div>
    )
  }

  // Filtrar categorías según el toggle
  const filteredCategories = showInactive
    ? categories
    : categories.filter(c => c.is_active !== false)

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Package size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Categorías
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => onToggleShowInactive(e.target.checked)}
            />
            Mostrar inactivas
          </label>
          <button className="btn btn-primary" onClick={onAddCategory}>
            <Plus size={18} />
            Agregar Categoría
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Icono</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {showInactive ? 'No hay categorías registradas' : 'No hay categorías activas'}
                </td>
              </tr>
            ) : (
              filteredCategories.map(category => {
                const IconComponent = ICON_OPTIONS.find(opt => opt.value === category.icon)?.icon || Package
                return (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconComponent size={18} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {category.icon}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: category.is_active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                          color: category.is_active !== false ? 'var(--success)' : 'var(--text-secondary)'
                        }}
                      >
                        {category.is_active !== false ? (
                          <>
                            <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Activa
                          </>
                        ) : (
                          <>
                            <Ban size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Inactiva
                          </>
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditCategory(category)}
                          title="Editar categoría"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className={`btn btn-sm ${category.is_active !== false ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => onToggleStatus(category)}
                          title={category.is_active !== false ? 'Desactivar categoría' : 'Activar categoría'}
                        >
                          {category.is_active !== false ? <Ban size={14} /> : <RefreshCw size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CategoriesSection
