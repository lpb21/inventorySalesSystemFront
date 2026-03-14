import { Lock } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'

/**
 * PlanGuard — renderiza `children` solo si el tenant tiene el feature activo.
 *
 * Props:
 *   requiredFeature  {string}  - clave dentro de `limits.features` (ej. "advancedReports")
 *   children         {node}    - contenido que se muestra cuando hay acceso
 *   fallbackRender   {func}    - función que devuelve JSX alternativo (opcional)
 *                                Si no se provee, retorna null cuando no hay acceso
 *
 * El role "superadmin" siempre tiene acceso.
 * Si no hay información de limits (plan legacy / error de carga), se permite el acceso
 * para no bloquear funcionalidad existente.
 */
export function PlanGuard({ requiredFeature, children, fallbackRender }) {
  const { currentUser } = useGlobalContext()
  const limits = currentUser?.tenant?.limits

  // Sin info de límites → permitir (no bloquear en caso de respuesta incompleta)
  if (!limits) return children

  const hasAccess =
    currentUser?.role === 'superadmin' ||
    limits.features?.[requiredFeature] === true

  if (!hasAccess) {
    if (fallbackRender) return fallbackRender()
    return null
  }

  return children
}

/**
 * LockedFeature — bloque visual estándar para features bloqueados por plan.
 * Úsalo como `fallbackRender` en PlanGuard o de forma independiente.
 *
 * Props:
 *   label  {string}  - nombre de la funcionalidad (ej. "Reportes Avanzados")
 *   plan   {string}  - plan mínimo requerido (ej. "Pro") — opcional
 */
export function LockedFeature({ label, plan }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        cursor: 'default',
        userSelect: 'none',
      }}
      title={plan ? `Requiere plan ${plan}` : 'No disponible en tu plan actual'}
    >
      <Lock size={14} />
      <span>{label}</span>
      {plan && (
        <span
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            marginLeft: '4px',
          }}
        >
          {plan}
        </span>
      )}
    </div>
  )
}
