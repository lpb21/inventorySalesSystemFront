import { useState } from 'react'
import { X, Download, AlertCircle } from 'lucide-react'
import { API_URL, getToken } from '../../api/config'
import { exportSalesToCSV } from '../../utils/export'
import { useGlobalContext } from '../../context/GlobalContext'

function ExportSalesModal({ onClose }) {
  const { addToast } = useGlobalContext()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    setError(null)

    if (!startDate || !endDate) {
      setError('Por favor, selecciona tanto la fecha de inicio como la de fin.')
      return
    }

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T23:59:59`)
    const today = new Date()

    if (end > today) {
      setError('La fecha de fin no puede ser mayor a la fecha actual.')
      return
    }

    if (start > end) {
      setError('La fecha de inicio no puede ser mayor a la fecha de fin.')
      return
    }

    try {
      setIsExporting(true)
      const token = getToken()
      
      const response = await fetch(`${API_URL}/sales/by-date?start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener los datos de ventas')
      }

      const result = await response.json();
      const salesArray = result?.data?.sales || []

      if (salesArray.length === 0) {
         setError('No se encontraron ventas en el rango de fechas seleccionado.')
         return
      }

      exportSalesToCSV(salesArray, `reporte-ventas-${startDate}-al-${endDate}.csv`);
      addToast('Reporte descargado correctamente', 'success')
      onClose()
    } catch (err) {
      console.error("Error al descargar reporte", err);
      setError('Hubo un problema al generar el reporte. Intenta de nuevo.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Download size={24} />
            </div>
            <div>
              <h3 className="modal-title">Exportar Reporte de Ventas</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Selecciona un rango de fechas para descargar el detalle en CSV
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ 
              backgroundColor: 'rgba(233, 69, 96, 0.1)', 
              color: 'var(--danger)', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Fecha Inicio</label>
              <input 
                type="date" 
                className="form-input" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Fecha Fin</label>
              <input 
                type="date" 
                className="form-input" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isExporting}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleExport}
            disabled={isExporting || !startDate || !endDate}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isExporting ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                Procesando...
              </>
            ) : (
              <>
                <Download size={18} />
                Descargar CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportSalesModal
