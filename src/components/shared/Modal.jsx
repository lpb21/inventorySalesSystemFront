import { useCallback, useEffect, useRef } from 'react'

// Diálogo accesible compartido. Reemplaza el par
// <div className="modal-overlay"> + <div className="modal"> que cada modal
// repetía, y agrega lo que faltaba en los 21: rol de diálogo, foco atrapado,
// devolución del foco al cerrar, tecla Escape y bloqueo del scroll de fondo.
//
// Props:
//   title         texto del título visible; se usa como nombre accesible
//   labelledBy    id del título visible, si se prefiere sobre `title`
//   onClose       cierre solicitado por Escape, overlay o el botón X
//   dismissible   false mientras una operación no debe interrumpirse
//   confirmClose  async () => boolean; si devuelve false el modal no se cierra
//   maxWidth      ancho máximo; mismo valor que antes iba en style inline.
//                 Omitirlo deja mandar al max-width del CSS de la clase.
//   overlayClassName / dialogClassName
//                 para la familia .alert-modal, que tiene su propio CSS

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const SWAL_OPEN = '.swal2-container'

// Pila de modales abiertos. Solo el último responde a Escape, para que un
// modal anidado no cierre también al que lo abrió.
const stack = []

function Modal({
  children,
  onClose,
  title,
  labelledBy,
  dismissible = true,
  confirmClose,
  maxWidth,
  overlayClassName = 'modal-overlay',
  dialogClassName = 'modal',
  className = '',
  style,
}) {
  const dialogRef = useRef(null)
  const restoreRef = useRef(null)
  const closingRef = useRef(false)

  const attemptClose = useCallback(async () => {
    if (!dismissible || closingRef.current) return
    if (confirmClose) {
      closingRef.current = true
      try {
        const ok = await confirmClose()
        if (!ok) return
      } finally {
        closingRef.current = false
      }
    }
    onClose?.()
  }, [dismissible, confirmClose, onClose])

  // Foco: recordar quién abrió, enfocar dentro, devolver al desmontar.
  useEffect(() => {
    restoreRef.current = document.activeElement

    const node = dialogRef.current
    // Un campo con autoFocus ya tomó el foco al montarse: se respeta.
    if (node && !node.contains(document.activeElement)) {
      // La X del encabezado va primero en el DOM, pero quien abre un
      // formulario quiere escribir, no cerrar: se prefiere el primer control
      // que no sea el botón de cierre.
      const items = Array.from(node.querySelectorAll(FOCUSABLE))
      const first = items.find(el => !el.classList.contains('modal-close')) || items[0]
      // Un diálogo sin controles enfocables recibe el foco él mismo, para que
      // el lector de pantalla anuncie su nombre al abrir.
      ;(first || node).focus({ preventScroll: true })
    }

    return () => {
      const prev = restoreRef.current
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus({ preventScroll: true })
      }
    }
  }, [])

  // Escape y foco atrapado. Solo actúa si este modal está en el tope de la pila.
  useEffect(() => {
    const token = {}
    stack.push(token)

    function onKeyDown(e) {
      if (stack[stack.length - 1] !== token) return
      // Una alerta de SweetAlert abierta encima maneja su propio teclado. Sin
      // esto, Escape cerraba el modal de atrás en vez de la alerta y Tab le
      // quitaba el foco.
      if (document.querySelector(SWAL_OPEN)) return

      if (e.key === 'Escape') {
        e.stopPropagation()
        attemptClose()
        return
      }

      if (e.key !== 'Tab') return

      const node = dialogRef.current
      if (!node) return

      const items = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      )
      if (items.length === 0) {
        e.preventDefault()
        node.focus({ preventScroll: true })
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      // El ciclo se cierra sobre sí mismo: sin esto, Tab lleva el foco detrás
      // del overlay y deja operar la pantalla bloqueada.
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const i = stack.indexOf(token)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [attemptClose])

  // Scroll de fondo: se restaura cuando se cierra el último modal abierto.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      if (stack.length <= 1) document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      className={overlayClassName}
      onClick={dismissible ? attemptClose : undefined}
      style={dismissible ? undefined : { cursor: 'default' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={className ? `${dialogClassName} ${className}` : dialogClassName}
        onClick={e => e.stopPropagation()}
        style={maxWidth ? { maxWidth, ...style } : style}
      >
        {children}
      </div>
    </div>
  )
}

export default Modal
