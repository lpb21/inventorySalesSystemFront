import { X, BookOpen, Trash2, Scissors, Package } from 'lucide-react'
import Swal from 'sweetalert2'
import { useRecipes, useRecipeMutations } from '../../hooks/queries/useRecipes'
 
/**
 * RecipeManagerModal — Gestor de recetas de despiece.
 * Fase 1: listar y borrar. (Crear/editar se agregará después.)
 */
function RecipeManagerModal({ onClose, addToast }) {
  const { data: recipes = [], isLoading } = useRecipes()
  const { remove } = useRecipeMutations()
 
  const handleDelete = async (recipe) => {
    const result = await Swal.fire({
      title: '¿Borrar receta?',
      html: `
        <p style="color: var(--text-primary);">
          Se eliminará la receta <strong>"${recipe.name}"</strong>.
        </p>
        <p style="color: var(--text-secondary); font-size: 14px;">
          Esto no afecta tus productos ni el inventario, solo la plantilla de despiece.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e94560',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
      background: '#1a1f2e',
      color: '#e6edf3',
    })
 
    if (!result.isConfirmed) return
 
    try {
      await remove.mutateAsync(recipe.id)
      addToast?.('Receta eliminada', 'success')
    } catch (error) {
      addToast?.('Error al eliminar la receta: ' + (error.message || ''), 'error')
    }
  }
 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(233, 69, 96, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="modal-title">Recetas de Despiece</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Plantillas para agilizar el despiece
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
 
        <div className="modal-body">
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Cargando recetas...
            </div>
          ) : recipes.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Scissors size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p>Aún no tienes recetas de despiece.</p>
              <p style={{ fontSize: '13px' }}>
                Las recetas te permiten pre-llenar los cortes al despiezar.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipes.map(recipe => (
                <div
                  key={recipe.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'var(--bg-secondary)',
                    borderRadius: '10px', border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: 'rgba(233, 69, 96, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)', flexShrink: 0
                    }}>
                      <Scissors size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {recipe.name}
                      </div>
                      <div style={{
                        fontSize: '12px', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px'
                      }}>
                        <Package size={12} />
                        Origen: {recipe.sourceProduct?.name || 'Producto'}
                      </div>
                    </div>
                  </div>
 
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(recipe)}
                    disabled={remove.isPending}
                    style={{ padding: '8px 10px' }}
                    title="Borrar receta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
 
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
 
export default RecipeManagerModal