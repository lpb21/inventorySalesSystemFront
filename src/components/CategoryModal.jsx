import { useState } from 'react'
import { 
  X, Save, Package2, Coffee, Utensils, UtensilsCrossed, Apple, Pizza, 
  Hamburger , Salad, Drumstick, Egg, Croissant, Wine, 
  GlassWater, Beer, Cake, Cookie, IceCream, Sandwich, Milk, 
  CupSoda, Carrot, Popcorn, Cherry, Grape, Banana, 
  Citrus, Leaf, Flower2, TreePine, Home, ShoppingCart, 
  Wallet, CreditCard, Tag, Tags, ShoppingBag, Store, Box, Gift, Fish
} from 'lucide-react'

// Iconos de comida y categorías genéricas
const ICON_OPTIONS = [
  // General
  { name: 'package', icon: Package2, label: 'Paquete' },
  { name: 'box', icon: Box, label: 'Caja' },
  { name: 'gift', icon: Gift, label: 'Regalo' },
  { name: 'home', icon: Home, label: 'Hogar' },
  { name: 'store', icon: Store, label: 'Tienda' },
  
  // Bebidas
  { name: 'coffee', icon: Coffee, label: 'Café' },
  { name: 'wine', icon: Wine, label: 'Vino' },
  { name: 'glass-water', icon: GlassWater, label: 'Agua' },
  { name: 'beer', icon: Beer, label: 'Cerveza' },
  { name: 'milk', icon: Milk, label: 'Leche' },
  { name: 'cup-soda', icon: CupSoda, label: 'Refresco' },
  
  // Comida rápida
  { name: 'pizza', icon: Pizza, label: 'Pizza' },
  { name: 'hamburger', icon: Hamburger, label: 'Hamburguesa' },
  { name: 'sandwich', icon: Sandwich, label: 'Sándwich' },
  { name: 'hot-dog', icon: Drumstick, label: 'Hot Dog' },
  { name: 'taco', icon: Utensils, label: 'Taco' },
  
  // Postres y dulces
  { name: 'cake', icon: Cake, label: 'Pastel' },
  { name: 'cookie', icon: Cookie, label: 'Galleta' },
  { name: 'ice-cream', icon: IceCream, label: 'Helado' },
  { name: 'candy', icon: CupSoda, label: 'Dulce' },
  { name: 'chocolate', icon: Cake, label: 'Chocolate' },
  
  // Panadería
  { name: 'croissant', icon: Croissant, label: 'Croissant' },
  { name: 'bread', icon: Croissant, label: 'Pan' },
  { name: 'egg', icon: Egg, label: 'Huevo' },
  
  // Frutas
  { name: 'apple', icon: Apple, label: 'Manzana' },
  { name: 'banana', icon: Banana, label: 'Banano' },
  { name: 'citrus', icon: Citrus, label: 'Limón' },
  { name: 'cherry', icon: Cherry, label: 'Cereza' },
  { name: 'grape', icon: Grape, label: 'Uvas' },
  { name: 'strawberry', icon: Cherry, label: 'Fresa' },
  
  // Vegetales
  { name: 'carrot', icon: Carrot, label: 'Zanahoria' },
  { name: 'popcorn', icon: Popcorn, label: 'Maíz' },
  { name: 'pepper', icon: Apple, label: 'Pimiento' },
  { name: 'salad', icon: Salad, label: 'Ensalada' },
  
  // Carnes y pescados
  { name: 'drumstick', icon: Drumstick, label: 'Pollo' },
  { name: 'steak', icon: Drumstick, label: 'Carne' },
  { name: 'fish', icon: Fish, label: 'Pescado' },
  
  // Marcas / Shopping
  { name: 'shopping-cart', icon: ShoppingCart, label: 'Carrito' },
  { name: 'shopping-bag', icon: ShoppingBag, label: 'Bolsa' },
  { name: 'wallet', icon: Wallet, label: 'Billetera' },
  { name: 'credit-card', icon: CreditCard, label: 'Tarjeta' },
  { name: 'tag', icon: Tag, label: 'Etiqueta' },
  { name: 'tags', icon: Tags, label: 'Etiquetas' },
  
  // Naturaleza
  { name: 'leaf', icon: Leaf, label: 'Hoja' },
  { name: 'flower', icon: Flower2, label: 'Flor' },
  { name: 'tree', icon: TreePine, label: 'Árbol' },
]

/**
 * Modal para crear una nueva categoría.
 * Gestiona su propio estado de texto internamente
 * y delega la lógica de guardado a onSave.
 */
function CategoryModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('package')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon
      })
    } finally {
      setLoading(false)
    }
  }

  // Encontrar el icono seleccionado para mostrar en preview
  const selectedIconData = ICON_OPTIONS.find(i => i.name === selectedIcon) || ICON_OPTIONS[0]
  const SelectedIconComponent = selectedIconData.icon

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', width: '95%' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nueva Categoría</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-group">
              <label className="form-label">Nombre de la Categoría</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Bebidas, Congelados, etc."
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción (opcional)</label>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Todas las bebidas disponibles en el negocio"
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Icono</label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '12px',
                padding: '12px',
                background: 'var(--background)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <SelectedIconComponent size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, display: 'block' }}>
                    {selectedIconData.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Selecciona un icono
                  </span>
                </div>
              </div>
              
              {/* Grid de iconos */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: '8px',
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--background)'
              }}>
                {ICON_OPTIONS.map(({ name: iconName, icon: IconComp, label }) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '8px',
                      border: selectedIcon === iconName ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: selectedIcon === iconName ? 'var(--accent)' : 'var(--bg-primary)',
                      color: selectedIcon === iconName ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      padding: '4px'
                    }}
                    title={label}
                  >
                    <IconComp size={20} />
                    <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryModal

