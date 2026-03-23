import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, Check, AlertCircle, Download, Trash2 } from 'lucide-react'
import { API_URL, getToken, categoriesAPI, suppliersAPI, ApiNormalizers } from '../../api/config'
import {
  parseCSVLine,
  normalizeHeader,
  validateCSVStructure,
  downloadCSVTemplate
} from '../../utils/csvUtils'

function ImportModal({ onClose, onImportComplete }) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressDetail, setProgressDetail] = useState({ processed: 0, total: 0, successCount: 0, errorCount: 0, message: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [validationInfo, setValidationInfo] = useState(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Manejar eventos de drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Manejar drop
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }

  // Manejar selección de archivo
  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  /**
   * Valida la estructura del CSV: que exista encabezado y al menos una fila con nombre.
   * Deja que el backend valide detalles como categoría existente o precios numéricos.
   * Devuelve { valid: true, totalProducts, headers } o { valid: false, errors: string[] }.
   */
  const validateCSVStructure = (text) => {
    const errors = []
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)

    if (lines.length < 2) {
      errors.push('El archivo debe tener una fila de encabezados y al menos una fila de datos.')
      return { valid: false, errors }
    }

    const headerLine = lines[0]
    
    // Detectar delimitador (punto y coma o coma)
    let delimiter = ','
    if (!headerLine.includes(',') && headerLine.includes(';')) {
      delimiter = ';'
    }

    const headerCells = delimiter === ',' ? parseCSVLine(headerLine) : headerLine.split(';')
    const normalizedHeaders = headerCells.map((h) => normalizeHeader(h))

    const missing = REQUIRED_CSV_HEADERS.filter((req) => !normalizedHeaders.includes(req))
    if (missing.length > 0) {
      errors.push(
        `Faltan columnas obligatorias: ${missing.join(', ')}. ` +
          'El CSV debe incluir al menos la columna "name" (nombre del producto).'
      )
      return { valid: false, errors }
    }

    const nameIdx = normalizedHeaders.indexOf('name')
    if (nameIdx === -1) {
      errors.push('No se encontró la columna "name" en los encabezados.')
      return { valid: false, errors }
    }

    let validRows = 0
    for (let i = 1; i < lines.length; i++) {
      const cells = delimiter === ',' ? parseCSVLine(lines[i]) : lines[i].split(';')
      let name = (cells[nameIdx] || '').trim()
      if (delimiter === ';') name = name.replace(/^"|"$/g, '')

      if (!name) {
        // Coincide con la regla del backend: nombre requerido
        errors.push(`Fila ${i + 1}: el nombre del producto no puede estar vacío.`)
        continue
      }

      validRows++
    }

    if (validRows === 0) {
      if (errors.length === 0) {
        errors.push('No hay filas válidas. Cada fila debe tener al menos el nombre del producto.')
      }
      return { valid: false, errors }
    }

    return {
      valid: true,
      totalProducts: validRows,
      headers: normalizedHeaders,
      structureErrors: errors.length ? errors : undefined,
    }
  }

  const validateCSV = (selectedFile) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = (e.target.result || '').toString()
          const result = validateCSVStructure(text)
          if (result.valid) {
            resolve({
              totalProducts: result.totalProducts,
              headers: result.headers,
            })
          } else {
            const message =
              result.errors && result.errors.length > 0
                ? result.errors.slice(0, 5).join(' ')
                : 'La estructura del CSV no es válida. Use el ejemplo del modal como referencia.'
            reject(new Error(message))
          }
        } catch (err) {
          reject(new Error('Error al leer el archivo CSV: ' + (err.message || 'desconocido')))
        }
      }
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
      reader.readAsText(selectedFile, 'UTF-8')
    })
  }

  // Validar archivo
  const validateAndSetFile = async (selectedFile) => {
    setError(null)
    setResult(null)
    
    // Validar tipo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    const validExtensions = ['.csv']
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      setError('Por favor selecciona un archivo CSV válido')
      return
    }
    
    // Validar tamaño (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5MB')
      return
    }
    
    // Validar estructura del CSV
    try {
      const validation = await validateCSV(selectedFile)
      console.log('CSV Validado:', validation)
      setFile(selectedFile)
      setValidationInfo(validation)
    } catch (err) {
      setError(err.message)
    }
  }

  // Eliminar archivo seleccionado
  const removeFile = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const closeStream = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
      } catch (_) {}
      abortControllerRef.current = null
    }
  }

  useEffect(() => {
    return () => closeStream()
  }, [])

  // Extraer mensaje de error del body de la API (varias formas posibles)
  const getErrorMessage = (body, status, fallback = 'Error al importar productos') => {
    if (!body || typeof body !== 'object') return fallback
    const msg = body.error?.message ?? body.message ?? body.error ?? (Array.isArray(body.errors) ? body.errors[0] : body.errors)
    if (typeof msg === 'string') return msg
    if (msg && typeof msg === 'object' && msg.message) return msg.message
    return fallback
  }

  /**
   * Lee el archivo CSV, identifica categorías únicas y las crea si no existen.
   */
  const ensureCategoriesExist = async (file) => {
    setProgressDetail(prev => ({ ...prev, message: 'Analizando categorías en el archivo...' }))
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const text = (e.target.result || '').toString()
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
          if (lines.length < 2) return resolve()

          const headerLine = lines[0]
          
          // Detectar delimitador (punto y coma o coma)
          let delimiter = ','
          if (!headerLine.includes(',') && headerLine.includes(';')) {
            delimiter = ';'
            console.log('[Importar CSV] Detectado delimitador punto y coma (;)')
          }

          const cells = delimiter === ',' ? parseCSVLine(headerLine) : headerLine.split(';')
          const normalizedHeaders = cells.map(h => normalizeHeader(h))
          const catIdx = normalizedHeaders.indexOf('category')
          
          if (catIdx === -1) {
            console.log('[Importar CSV] No se encontró columna de categoría en:', normalizedHeaders)
            return resolve()
          }

          const uniqueCategories = new Set()
          for (let i = 1; i < lines.length; i++) {
             const rowCells = delimiter === ',' ? parseCSVLine(lines[i]) : lines[i].split(';')
             let catName = (rowCells[catIdx] || '').trim()
             // Quitar comillas si vienen en el split simple del punto y coma
             if (delimiter === ';') catName = catName.replace(/^"|"$/g, '')
             if (catName) uniqueCategories.add(catName)
          }

          if (uniqueCategories.size === 0) {
            console.log('[Importar CSV] No se encontraron nombres de categorías en la columna', catIdx)
            return resolve()
          }

          setProgressDetail(prev => ({ ...prev, message: `Verificando ${uniqueCategories.size} categorías...` }))
          
          const existingResponse = await categoriesAPI.getAllWithInactive()
          const existingList = ApiNormalizers.normalizeList(existingResponse, ['categories', 'data'])
          
          // Crear un mapa de categorías existentes para búsqueda rápida (case-insensitive)
          const existingMap = new Map()
          existingList.forEach(c => {
            if (c.name) {
              const key = c.name.trim().toLowerCase()
              // Si hay duplicados en el DB, preferir la activa
              if (!existingMap.has(key) || c.is_active !== false) {
                existingMap.set(key, c)
              }
            }
          })

          let createdCount = 0
          let reactivatedCount = 0
          const categoriesToHandle = Array.from(uniqueCategories)

          for (let i = 0; i < categoriesToHandle.length; i++) {
            const name = categoriesToHandle[i].trim()
            if (!name) continue
            
            const lowerName = name.toLowerCase()
            const existing = existingMap.get(lowerName)

            if (!existing) {
              // CREAR categoría nueva
              setProgressDetail(prev => ({ 
                ...prev, 
                message: `Creando categoría (${i + 1}/${categoriesToHandle.length}): ${name}...` 
              }))
              try {
                await categoriesAPI.create({ 
                  name, 
                  description: 'Creada automáticamente durante importación masiva' 
                })
                createdCount++
                console.log(`[Importar CSV] Categoría creada: ${name}`)
              } catch (catErr) {
                console.warn(`[Importar CSV] No se pudo crear categoría "${name}":`, catErr)
              }
            } else if (existing.is_active === false) {
              // REACTIVAR categoría existente si está inactiva
              setProgressDetail(prev => ({ 
                ...prev, 
                message: `Reactivando categoría (${i + 1}/${categoriesToHandle.length}): ${name}...` 
              }))
              try {
                // El backend permite PUT a /v1/categories/:id con is_active: true
                await categoriesAPI.reactivate(existing.id)
                reactivatedCount++
                console.log(`[Importar CSV] Categoría reactivada: ${name}`)
              } catch (reactErr) {
                console.warn(`[Importar CSV] No se pudo reactivar categoría "${name}":`, reactErr)
              }
            }
          }

          if (createdCount > 0 || reactivatedCount > 0) {
            const msg = `Resumen: ${createdCount > 0 ? `${createdCount} creadas` : ''}${createdCount > 0 && reactivatedCount > 0 ? ', ' : ''}${reactivatedCount > 0 ? `${reactivatedCount} reactivadas` : ''}.`
            setProgressDetail(prev => ({ ...prev, message: msg }))
            // Pausa para asegurar sincronización con el backend
            await new Promise(r => setTimeout(r, 800))
          } else {
            console.log('[Importar CSV] No se requirieron cambios en las categorías.')
          }

          resolve()
        } catch (error) {
          console.error('[Importar CSV] Error crítico en ensureCategoriesExist:', error)
          reject(new Error('Error al preparar las categorías: ' + (error.message || 'Error desconocido')))
        }
      }
      reader.onerror = () => reject(new Error('No se pudo leer el archivo para verificar categorías.'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  /**
   * Lee el archivo CSV, identifica proveedores únicos y los crea si no existen.
   */
  const ensureSuppliersExist = async (file) => {
    setProgressDetail(prev => ({ ...prev, message: 'Analizando proveedores en el archivo...' }))
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const text = (e.target.result || '').toString()
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
          if (lines.length < 2) return resolve()

          const headerLine = lines[0]
          
          // Detectar delimitador (punto y coma o coma)
          let delimiter = ','
          if (!headerLine.includes(',') && headerLine.includes(';')) {
            delimiter = ';'
            console.log('[Importar CSV] Detectado delimitador punto y coma (;)')
          }

          const cells = delimiter === ',' ? parseCSVLine(headerLine) : headerLine.split(';')
          const normalizedHeaders = cells.map(h => normalizeHeader(h))
          const supplierIdx = normalizedHeaders.indexOf('supplier')
          
          if (supplierIdx === -1) {
            console.log('[Importar CSV] No se encontró columna de proveedor en:', normalizedHeaders)
            return resolve()
          }

          const uniqueSuppliers = new Set()
          for (let i = 1; i < lines.length; i++) {
             const rowCells = delimiter === ',' ? parseCSVLine(lines[i]) : lines[i].split(';')
             let supplierName = (rowCells[supplierIdx] || '').trim()
             // Quitar comillas si vienen en el split simple del punto y coma
             if (delimiter === ';') supplierName = supplierName.replace(/^"|"$/g, '')
             if (supplierName) uniqueSuppliers.add(supplierName)
          }

          if (uniqueSuppliers.size === 0) {
            console.log('[Importar CSV] No se encontraron nombres de proveedores en la columna', supplierIdx)
            return resolve()
          }

          setProgressDetail(prev => ({ ...prev, message: `Verificando ${uniqueSuppliers.size} proveedores...` }))
          
          const existingResponse = await suppliersAPI.getAll()
          const existingList = ApiNormalizers.normalizeList(existingResponse, ['suppliers', 'data'])
          
          // Crear un mapa de suppliers existentes para búsqueda rápida (case-insensitive)
          const existingMap = new Map()
          existingList.forEach(s => {
            if (s.name) {
              const key = s.name.trim().toLowerCase()
              existingMap.set(key, s)
            }
          })

          let createdCount = 0
          const suppliersToHandle = Array.from(uniqueSuppliers)

          for (let i = 0; i < suppliersToHandle.length; i++) {
            const name = suppliersToHandle[i].trim()
            if (!name) continue
            
            const lowerName = name.toLowerCase()
            const existing = existingMap.get(lowerName)

            if (!existing) {
              // CREAR proveedor nuevo
              setProgressDetail(prev => ({ 
                ...prev, 
                message: `Creando proveedor (${i + 1}/${suppliersToHandle.length}): ${name}...` 
              }))
              try {
                await suppliersAPI.create({ 
                  name,
                  contact_name: null,
                  document: null,
                  email: null
                })
                createdCount++
                console.log(`[Importar CSV] Proveedor creado: ${name}`)
              } catch (suppErr) {
                console.warn(`[Importar CSV] No se pudo crear proveedor "${name}":`, suppErr)
              }
            }
          }

          if (createdCount > 0) {
            const msg = `Proveedores: ${createdCount} creados.`
            setProgressDetail(prev => ({ ...prev, message: msg }))
            // Pausa para asegurar sincronización con el backend
            await new Promise(r => setTimeout(r, 800))
          } else {
            console.log('[Importar CSV] No se requirieron cambios en los proveedores.')
          }

          resolve()
        } catch (error) {
          console.error('[Importar CSV] Error crítico en ensureSuppliersExist:', error)
          reject(new Error('Error al preparar los proveedores: ' + (error.message || 'Error desconocido')))
        }
      }
      reader.onerror = () => reject(new Error('No se pudo leer el archivo para verificar proveedores.'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  // POST /v1/products/import que responde directamente con SSE
  const handleUpload = async () => {
    if (!file) return

    setError(null)
    setProgressDetail({ processed: 0, total: 0, successCount: 0, errorCount: 0, message: '' })
    closeStream()

    let validation
    try {
      validation = await validateCSV(file)
    } catch (err) {
      const msg = err?.message || 'El archivo CSV no tiene la estructura esperada.'
      console.error('[Importar CSV] Validación de estructura fallida:', msg)
      setError(msg)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    // NUEVO: Asegurar que las categorías y proveedores existan antes de enviar el archivo al backend
    try {
      await ensureCategoriesExist(file)
      await ensureSuppliersExist(file)
    } catch (err) {
      console.error('[Importar CSV] Error asegurando categorías o proveedores:', err)
      setError(err.message || 'Error al preparar las categorías y proveedores necesarios.')
      setUploading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const postUrl = `${API_URL}/products/import`
    const token = getToken()

    console.log('[Importar CSV] POST con SSE directo:', postUrl, 'archivo:', file.name, 'filas válidas:', validation?.totalProducts)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // POST que responde directamente con SSE
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // NO agregar Content-Type - FormData lo configura automáticamente
        },
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        let body = {}
        try {
          body = await response.json()
        } catch (_) {
          console.warn('[Importar CSV] Body de error no es JSON')
        }
        const message = getErrorMessage(body, response.status) || `Error del servidor (${response.status})`
        console.error('[Importar CSV] POST error', response.status, message)
        throw new Error(message)
      }

      console.log('[Importar CSV] Conexión SSE establecida, leyendo stream...')

      // Leer el stream SSE directamente del response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let totalExpected = validation?.totalProducts || 0
      let lastEventTime = Date.now()
      const EVENT_TIMEOUT = 60000 // 60 segundos sin eventos

      // Verificar timeout periódicamente
      const timeoutChecker = setInterval(() => {
        const timeSinceLastEvent = Date.now() - lastEventTime
        if (timeSinceLastEvent > EVENT_TIMEOUT) {
          console.warn('[Importar CSV] No se han recibido eventos en', timeSinceLastEvent, 'ms')
          clearInterval(timeoutChecker)
          reader.cancel()
          setError('El servidor dejó de enviar actualizaciones. Verifica en el inventario si los productos se importaron.')
          setUploading(false)
        }
      }, 5000) // Verificar cada 5 segundos

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          clearInterval(timeoutChecker)
          console.log('[Importar CSV] Stream finalizado por el servidor')
          break
        }

        // Decodificar y agregar al buffer
        buffer += decoder.decode(value, { stream: true })
        lastEventTime = Date.now()
        
        console.log('[Importar CSV] Chunk recibido, buffer length:', buffer.length)
        
        // Procesar líneas completas
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Guardar línea incompleta

        console.log('[Importar CSV] Procesando', lines.length, 'líneas del buffer')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim()
            
            console.log('[Importar CSV] Línea SSE:', data.substring(0, 150) + (data.length > 150 ? '...' : ''))
            
            if (data) {
              try {
                const progress = JSON.parse(data)
                console.log('[Importar CSV] Evento recibido:', progress)
                
                const status = progress.status || ''
                
                // 1. Evento inicial de conexión
                if (status === 'connected') {
                  console.log('[Importar CSV] Conexión establecida:', progress.message)
                  totalExpected = progress.total || totalExpected
                  setProgressDetail(prev => ({ ...prev, total: totalExpected, message: progress.message || 'Conectado' }))
                  continue
                }
                
                // 2. Evento de error
                if (status === 'error') {
                  clearInterval(timeoutChecker)
                  reader.cancel()
                  throw new Error(progress.message || 'Error durante la importación')
                }
                
                // 3. Eventos de procesamiento o completado
                const progressPercent = Number(progress.progress) || 0
                const processed = Number(progress.processed) || 0
                const total = Number(progress.total) || totalExpected
                const successCount = Number(progress.successCount) || 0
                const errorCount = Number(progress.errorCount) || 0
                const message = progress.message || ''

                // Actualizar UI
                setUploadProgress(Math.min(100, Math.max(0, progressPercent)))
                setProgressDetail({ processed, total, successCount, errorCount, message })

                // 4. Completado
                if (status === 'completed') {
                  console.log('[Importar CSV] ✅ Importación completada:', { successCount, errorCount, processed, total })
                  
                  // Mapear errores correctamente
                  const errors = progress.results?.errors || []
                  console.log('[Importar CSV] Errores recibidos:', errors)
                  
                  clearInterval(timeoutChecker)
                  reader.cancel()
                  abortControllerRef.current = null
                  
                  setResult({
                    imported: successCount,
                    successCount,
                    errorCount,
                    message,
                    processed,
                    total,
                    errors: errors, // Array de {row, error}
                    successItems: progress.results?.success || []
                  })
                  
                  if (onImportComplete) {
                    onImportComplete({ 
                      imported: successCount, 
                      successCount, 
                      errorCount, 
                      processed, 
                      total, 
                      message 
                    })
                  }
                  
                  setUploading(false)
                  setUploadProgress(100)
                  break
                }
              } catch (e) {
                console.error('[Importar CSV] Error al parsear evento:', e, 'Datos:', data)
              }
            }
          }
        }
      }
      
    } catch (err) {
      closeStream()
      
      // Mejorar mensaje de error
      let msg = err?.message || 'Error al importar productos'
      if (err?.name === 'AbortError') {
        msg = 'La importación fue cancelada o el tiempo de espera se agotó.'
      }
      
      console.error('[Importar CSV] Error:', msg, err)
      setError(msg)
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Descargar ejemplo de CSV
  const downloadExample = () => {
    const csvContent = `name,category,supplier,description,sku,barcode,price,cost,stock,min_stock,unit,type,notes,expiry_date
"Monitor Samsung 24","Tecnología","Samsung Electronics","Monitor LED 24 pulgadas","MON-SAM-24","7891234567801",299.99,220.00,15,5,"und","unit","","2026-12-31"
"Laptop HP","Tecnología","HP Inc","Laptop HP Pavilion 15","LAP-HP-PAV","7891234567802",899.99,650.00,8,2,"und","unit","","2026-12-31"
"Papel Higiénico 12 rollos","Limpieza","Familia","Papel higiénico doble hoja x 12 rollos","PAP-FAM-12R","7890123456780",15.99,10.80,25,8,"paq","unit","","2025-09-15"
"Arroz Diana 500g","Granos","Molinos Diana","Arroz blanco premium 500g","ARZ-DIA-500","7891234567803",2.50,1.80,50,10,"und","unit","","2025-12-31"
"Queso Mozzarella","Quesos","","Queso mozzarella italiano importado","QUE-MOZ-01","7891234567804",28.00,20.00,25,10,"kg","weight","Sin proveedor","2025-09-30"`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'ejemplo_importacion_productos.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Descargar errores como CSV
  const downloadErrors = () => {
    if (!result?.errors || result.errors.length === 0) return
    
    let csvContent = 'Fila,Error\n'
    result.errors.forEach(err => {
      const row = err.row || 'N/A'
      const error = (err.error || err.message || String(err)).replace(/"/g, '""') // Escapar comillas
      csvContent += `${row},"${error}"\n`
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `errores_importacion_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="modal-overlay" onClick={uploading ? undefined : onClose} style={{ cursor: uploading ? 'default' : 'pointer' }}>
      <style>{`
        .error-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .error-list-scroll::-webkit-scrollbar-track {
          background: var(--surface);
          border-radius: 3px;
        }
        .error-list-scroll::-webkit-scrollbar-thumb {
          background: var(--accent);
          border-radius: 3px;
        }
        .error-list-scroll::-webkit-scrollbar-thumb:hover {
          background: #ff5577;
        }
      `}</style>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Upload size={24} />
            Importar Productos
          </h2>
          <button className="modal-close" onClick={uploading ? undefined : onClose} disabled={uploading} style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Información del formato */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '12px', 
            background: 'rgba(59, 130, 246, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={18} style={{ color: '#3b82f6' }} />
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>Formato requerido</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              El archivo CSV puede contener las siguientes columnas (mínimo <strong>name</strong>):
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', fontFamily: 'monospace' }}>
              name, category, supplier, description, sku, barcode, price, cost, stock, min_stock, unit, type, notes, expiry_date
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: '1.4' }}>
              📋 <strong>supplier</strong>: Si no existe → se crea automáticamente, si está vacío → producto sin proveedor<br/>
              📦 <strong>unit</strong>: "kg", "lb", "und", "paq" | <strong>type</strong>: se asigna automáticamente según unit
            </p>
            <button 
              onClick={downloadExample}
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#3b82f6',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={14} />
              Descargar ejemplo CSV
            </button>
          </div>

          {/* Área de drag and drop */}
          {result ? (
            // Mostrar resultado de importación
            <div style={{ 
              padding: '24px', 
              background: result.errorCount > 0 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(0, 217, 165, 0.1)', 
              borderRadius: '12px',
              border: `1px solid ${result.errorCount > 0 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(0, 217, 165, 0.3)'}`,
              textAlign: 'center'
            }}>
              <Check size={48} style={{ color: result.errorCount > 0 ? 'var(--warning)' : 'var(--success)', marginBottom: '16px' }} />
              <h3 style={{ color: result.errorCount > 0 ? 'var(--warning)' : 'var(--success)', marginBottom: '8px' }}>
                Importación completada
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {result.successCount > 0 && (
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                    ✅ {result.successCount} producto{result.successCount !== 1 ? 's' : ''} importado{result.successCount !== 1 ? 's' : ''} correctamente
                  </span>
                )}
                {result.successCount > 0 && result.errorCount > 0 && <br />}
                {result.errorCount > 0 && (
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                    ⚠️ {result.errorCount} fila{result.errorCount !== 1 ? 's' : ''} con error{result.errorCount !== 1 ? 'es' : ''}
                  </span>
                )}
              </p>
              
              {/* Mostrar errores detallados */}
              {result.errors && result.errors.length > 0 && (
                <div style={{ 
                  marginTop: '20px', 
                  textAlign: 'left',
                  background: 'rgba(233, 69, 96, 0.05)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(233, 69, 96, 0.2)'
                }}>
                  <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={18} />
                      Errores encontrados ({result.errors.length}):
                    </span>
                    {result.errors.length > 10 && (
                      <button
                        onClick={downloadErrors}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--danger)',
                          borderRadius: '6px',
                          color: 'var(--danger)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={14} />
                        Descargar errores CSV
                      </button>
                    )}
                  </p>
                  <div 
                    className="error-list-scroll"
                    style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto',
                      paddingRight: '8px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'var(--accent) var(--surface)'
                    }}
                  >
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '20px', margin: 0 }}>
                      {result.errors.slice(0, 50).map((err, idx) => (
                        <li key={idx} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
                          {err.row && <strong style={{ color: 'var(--accent)' }}>Fila {err.row}:</strong>}{' '}
                          {err.error || err.message || (typeof err === 'string' ? err : JSON.stringify(err))}
                        </li>
                      ))}
                      {result.errors.length > 50 && (
                        <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '8px' }}>
                          … y {result.errors.length - 50} error{result.errors.length - 50 !== 1 ? 'es' : ''} más
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {/* Sugerencias para corregir errores */}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '13px' }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      💡 <strong>Sugerencias:</strong>
                    </p>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '24px', color: 'var(--text-secondary)' }}>
                      {result.errors.some(e => (e.error || '').includes('no encontrada')) && (
                        <li>Verifica que las categorías existan en el sistema antes de importar</li>
                      )}
                      {result.errors.some(e => (e.error || '').includes('ya existe')) && (
                        <li>Algunos SKU o códigos de barras ya están registrados</li>
                      )}
                      <li>Corrige los errores en el CSV y vuelve a importarlo</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Archivo seleccionado */}
              {file ? (
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--surface)', 
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      padding: '10px', 
                      background: 'rgba(233, 69, 96, 0.15)', 
                      borderRadius: '8px' 
                    }}>
                      <FileText size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0 }}>{file.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={removeFile}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                // Área de drop
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  style={{
                    padding: '40px',
                    border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '12px',
                    background: dragActive ? 'rgba(233, 69, 96, 0.05)' : 'transparent',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  <Upload 
                    size={48} 
                    style={{ 
                      color: dragActive ? 'var(--accent)' : 'var(--text-secondary)',
                      marginBottom: '16px' 
                    }} 
                  />
                  <p style={{ fontWeight: 600, marginBottom: '8px' }}>
                    {dragActive ? 'Suelta el archivo aquí' : 'Arrastra y suelta tu archivo CSV aquí'}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    o haz clic para seleccionar un archivo
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '12px', 
                  background: 'rgba(233, 69, 96, 0.1)', 
                  borderRadius: '8px',
                  border: '1px solid rgba(233, 69, 96, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--danger)', fontSize: '14px', display: 'block' }}>{error}</span>
                    <button 
                      onClick={() => setError(null)}
                      style={{
                        marginTop: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Descartar error
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {uploading && (
            <div style={{ 
              width: '100%', 
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}>
                <span>{progressDetail.message || 'Procesando importación...'}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{uploadProgress}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                background: 'var(--border)', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${uploadProgress}%`, 
                  height: '100%', 
                  background: 'var(--accent)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {progressDetail.total > 0 && (
                  <span>Filas: {progressDetail.processed} / {progressDetail.total}</span>
                )}
                {!progressDetail.total && progressDetail.processed > 0 && (
                  <span>Filas: {progressDetail.processed}</span>
                )}
                <span style={{ color: 'var(--success)' }}>OK: {progressDetail.successCount}</span>
                {progressDetail.errorCount > 0 && (
                  <span style={{ color: 'var(--warning)' }}>Errores: {progressDetail.errorCount}</span>
                )}
              </div>
            </div>
          )}
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading} style={{ opacity: uploading ? 0.5 : 1 }}>
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && file && (
            <button 
              className="btn btn-primary" 
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Importar Productos
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportModal

