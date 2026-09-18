import { useState } from 'react'
import { Megaphone, Plus, X, Save, Pencil, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import { useAnnouncementsList, useAnnouncementMutations } from '../../hooks/queries/useAnnouncements'

/**
 * AdminAnnouncementsView — Panel de superadmin para el banner de anuncios
 * que ven todos los usuarios de todos los tenants al iniciar sesión.
 */
function AdminAnnouncementsView() {
  const { addToast } = useGlobalContext()
  const { data: announcements = [], isLoading } = useAnnouncementsList()
  const { create, update, toggle } = useAnnouncementMutations()

  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null) // null = crear nuevo

  const isExpired = (a) => a.expires_at && new Date(a.expires_at) < new Date()

  const handleToggle = async (announcement) => {
    try {
      await toggle.mutateAsync(announcement.id)
      addToast(announcement.is_active ? 'Anuncio desactivado' : 'Anuncio activado', 'success')
    } catch (error) {
      addToast('Error al cambiar el estado: ' + (error.message || ''), 'error')
    }
  }

  const handleSave = async (data) => {
    try {
      if (editingAnnouncement) {
        await update.mutateAsync({ id: editingAnnouncement.id, data })
        addToast('Anuncio actualizado', 'success')
      } else {
        await create.mutateAsync(data)
        addToast('Anuncio creado', 'success')
      }
      setShowModal(false)
      setEditingAnnouncement(null)
    } catch (error) {
      addToast('Error al guardar: ' + (error.message || ''), 'error')
    }
  }

  return (
    <div className="view-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Megaphone size={28} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ margin: 0 }}>Anuncios</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Mensajes que ven todos los usuarios en el dashboard al iniciar sesión
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingAnnouncement(null); setShowModal(true) }}
        >
          <Plus size={18} /> Nuevo Anuncio
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Cargando anuncios...
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Mensaje</th>
                  <th>Expira</th>
                  <th>Estado</th>
                  <th>Creado por</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map(a => (
                  <tr key={a.id}>
                    <td style={{ maxWidth: '360px' }}>{a.message}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {a.expires_at ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={13} />
                          {new Date(a.expires_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      ) : 'Sin expiración'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        color: a.is_active && !isExpired(a) ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: 500, fontSize: '13px'
                      }}>
                        {a.is_active
                          ? (isExpired(a) ? 'Activo (expirado)' : 'Activo')
                          : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {a.creator?.email || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setEditingAnnouncement(a); setShowModal(true) }}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggle(a)}
                          title={a.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {a.is_active ? <ToggleRight size={15} color="var(--success)" /> : <ToggleLeft size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {announcements.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      No hay anuncios todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => { setShowModal(false); setEditingAnnouncement(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

/**
 * Modal para crear o editar un anuncio (mensaje + fecha de expiración opcional).
 */
function AnnouncementModal({ announcement, onClose, onSave }) {
  const toLocalInputValue = (isoDate) => {
    if (!isoDate) return ''
    const d = new Date(isoDate)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [message, setMessage] = useState(announcement?.message || '')
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(announcement?.expires_at))
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!message.trim()) return
    setSaving(true)
    await onSave({
      message: message.trim(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{announcement ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Mensaje</label>
            <textarea
              className="form-input"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: Punto Fresco el día 25 va a estar en mantenimiento a las 10pm..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de expiración (opcional)</label>
            <input
              type="datetime-local"
              className="form-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div style={{
            padding: '10px 12px', background: 'var(--bg-secondary)',
            borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)'
          }}>
            Si no ponés fecha de expiración, el anuncio queda visible hasta que lo desactives manualmente.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !message.trim()}>
            {saving ? 'Guardando...' : (<><Save size={18} /> Guardar</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminAnnouncementsView
