import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useActiveAnnouncement } from '../../hooks/queries/useAnnouncements'

const DISMISSED_KEY = 'pf_dismissed_announcement_id'

/**
 * Banner de anuncios del superadmin (mantenimiento, avisos puntuales, etc).
 * Se muestra arriba de las tarjetas del dashboard a cualquier usuario logueado.
 * El cierre ("X") se guarda en localStorage por navegador: si se crea un
 * anuncio nuevo, vuelve a mostrarse aunque uno viejo se haya cerrado.
 */
function AnnouncementBanner() {
  const { data: announcement, isLoading } = useActiveAnnouncement()
  const [dismissedId, setDismissedId] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY)
    } catch {
      return null
    }
  })

  if (isLoading || !announcement || announcement.id === dismissedId) {
    return null
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, announcement.id)
    } catch {
      // localStorage puede fallar en modo privado - no bloquea el cierre visual
    }
    setDismissedId(announcement.id)
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      padding: '14px 16px',
      borderRadius: '8px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <Megaphone size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, flex: 1 }}>
        {announcement.message}
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar anuncio"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          opacity: 0.85,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85' }}
      >
        <X size={18} />
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default AnnouncementBanner
