import { useState } from 'react'
import { Plus, Edit, Building2, Mail, Phone, MapPin, FileText, Power } from 'lucide-react'
import { can } from '../../utils/permissions'
import { useGlobalContext } from '../../context/GlobalContext'
import { useSuppliers } from '../../hooks/useSuppliers'
import SupplierModal from '../inventory/SupplierModal'

function SuppliersView({ searchTerm = '' }) {
  const { 
    suppliers,
    currentUser, 
    addToast, 
    loadSuppliers
  } = useGlobalContext()

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const {
    saveSupplier,
    toggleSupplierStatus
  } = useSuppliers({ 
    addToast, 
    loadSuppliers, 
    editingSupplier, 
    setEditingSupplier, 
    setShowSupplierModal,
    setIsSaving
  })

  const canEdit = can(currentUser, 'canManageSuppliers') || can(currentUser, 'canManageCategories') || can(currentUser, 'canEditProducts')
  const canDelete = can(currentUser, 'canManageSuppliers') || can(currentUser, 'canManageCategories') || can(currentUser, 'canDeleteProducts')

  const handleToggleInactive = async (show) => {
    setShowInactive(show)
    await loadSuppliers(show)
  }

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Proveedores
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => handleToggleInactive(false)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: !showInactive ? 'var(--accent)' : 'transparent',
                color: !showInactive ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              Activos
            </button>
            <button
              onClick={() => handleToggleInactive(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: showInactive ? 'var(--accent)' : 'transparent',
                color: showInactive ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              Todos
            </button>
          </div>
          {canEdit && (
            <button 
              className="btn btn-primary" 
              onClick={() => { 
                setEditingSupplier(null); 
                setShowSupplierModal(true) 
              }}
            >
              <Plus size={18} />
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <Building2 size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {searchTerm 
              ? `No hay proveedores que coincidan con "${searchTerm}"`
              : 'Comienza agregando tu primer proveedor'
            }
          </p>
          {canEdit && !searchTerm && (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '16px' }}
              onClick={() => { 
                setEditingSupplier(null); 
                setShowSupplierModal(true) 
              }}
            >
              <Plus size={16} />
              Crear Proveedor
            </button>
          )}
        </div>
      ) : (
        <div className="suppliers-grid">
          <style>
            {`
              .suppliers-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 20px;
              }
              
              .supplier-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 20px;
                transition: all 0.2s ease;
                position: relative;
              }
              
              .supplier-card:hover {
                border-color: var(--accent);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
              }
              
              .supplier-card.inactive {
                opacity: 0.6;
              }
              
              .supplier-header {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                margin-bottom: 16px;
              }
              
              .supplier-icon {
                background: rgba(59, 130, 246, 0.1);
                border-radius: 10px;
                padding: 12px;
                flex-shrink: 0;
              }
              
              .supplier-info {
                flex: 1;
                min-width: 0;
              }
              
              .supplier-name {
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 4px 0;
                word-break: break-word;
              }
              
              .supplier-contact {
                font-size: 14px;
                color: var(--text-secondary);
                margin: 0;
              }
              
              .supplier-details {
                display: flex;
                flex-direction: column;
                gap: 8px;
              }
              
              .supplier-detail {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: var(--text-secondary);
              }
              
              .supplier-actions {
                display: flex;
                gap: 8px;
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid var(--border);
              }
            `}
          </style>
          
          {filteredSuppliers.map(supplier => (
            <div key={supplier.id} className={`supplier-card ${supplier.is_active === false ? 'inactive' : ''}`}>
              <div className="supplier-header">
                <div className="supplier-icon">
                  <Building2 size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div className="supplier-info">
                  <h3 className="supplier-name">{supplier.name}</h3>
                  {supplier.contact_name && (
                    <p className="supplier-contact">
                      Contacto: {supplier.contact_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="supplier-details">
                {supplier.email && (
                  <div className="supplier-detail">
                    <Mail size={14} />
                    <span>{supplier.email}</span>
                  </div>
                )}
                
                {supplier.phone && (
                  <div className="supplier-detail">
                    <Phone size={14} />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                
                {supplier.document && (
                  <div className="supplier-detail">
                    <FileText size={14} />
                    <span>RUC/Doc: {supplier.document}</span>
                  </div>
                )}
                
                {supplier.address && (
                  <div className="supplier-detail">
                    <MapPin size={14} />
                    <span>{supplier.address}</span>
                  </div>
                )}
                
                {supplier.notes && (
                  <div className="supplier-detail">
                    <FileText size={14} />
                    <span style={{ fontStyle: 'italic' }}>
                      {supplier.notes.length > 60 
                        ? `${supplier.notes.substring(0, 60)}...`
                        : supplier.notes
                      }
                    </span>
                  </div>
                )}
                
                {supplier.products_count !== undefined && (
                  <div className="supplier-detail">
                    <span style={{ fontWeight: 500 }}>
                      {supplier.products_count} producto{supplier.products_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              
              {(canEdit) && (
                <div className="supplier-actions">
                  {canEdit && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => { 
                        setEditingSupplier(supplier); 
                        setShowSupplierModal(true) 
                      }}
                    >
                      <Edit size={14} /> Editar
                    </button>
                  )}
                  {canEdit && (
                    <button 
                      className="btn btn-sm"
                      style={{ 
                        flex: '0 0 auto',
                        background: supplier.is_active === false ? 'rgba(0, 217, 165, 0.15)' : 'rgba(233, 69, 96, 0.15)',
                        border: `1px solid ${supplier.is_active === false ? 'var(--success)' : 'var(--danger)'}`,
                        color: supplier.is_active === false ? 'var(--success)' : 'var(--danger)'
                      }}
                      onClick={() => toggleSupplierStatus(supplier)}
                      title={supplier.is_active === false ? 'Activar proveedor' : 'Desactivar proveedor'}
                    >
                      <Power size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showSupplierModal && (
        <SupplierModal
          isOpen={showSupplierModal}
          editingSupplier={editingSupplier}
          onSave={saveSupplier}
          isSaving={isSaving}
          onClose={() => { 
            setShowSupplierModal(false); 
            setEditingSupplier(null) 
          }}
        />
      )}
    </div>
  )
}

export default SuppliersView

