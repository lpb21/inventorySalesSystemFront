import { useState, memo } from 'react'
import { 
  X, Save, Package2, PackageOpen, Box, Boxes, Coffee, Utensils, UtensilsCrossed, Apple, Pizza, 
  Hamburger, Salad, Drumstick, Egg, EggFried, Croissant, Wheat, Wine, 
  GlassWater, Beer, Cake, CakeSlice, Dessert, Cookie, IceCream, IceCreamCone, IceCreamBowl, Sandwich, Milk, 
  CupSoda, Carrot, Popcorn, Cherry, Grape, Banana, 
  Citrus, Leaf, LeafyGreen, Flower2, TreePine, Home, ShoppingCart, ShoppingBasket, 
  Wallet, CreditCard, Tag, Tags, ShoppingBag, Store, Gift, Fish, Shrimp, Ham, Beef,
  Candy, CandyCane, Lollipop, Popsicle, Donut, Martini, Soup, CookingPot, ChefHat,
  Nut, Slice, Snowflake, ThermometerSnowflake, Warehouse, Truck, Scale, Weight, Sparkles, Star, Heart, Flame
} from 'lucide-react'

// Iconos de comida y categorías genéricas
const ICON_OPTIONS = [
  // General
  { name: 'package', icon: Package2, label: 'Paquete' },
  { name: 'box', icon: Box, label: 'Caja' },
  { name: 'boxes', icon: Boxes, label: 'Cajas' },
  { name: 'package-open', icon: PackageOpen, label: 'Paquete abierto' },
  { name: 'gift', icon: Gift, label: 'Regalo' },
  { name: 'home', icon: Home, label: 'Hogar' },
  { name: 'store', icon: Store, label: 'Tienda' },
  { name: 'warehouse', icon: Warehouse, label: 'Bodega' },
  { name: 'truck', icon: Truck, label: 'Camión' },

  // Bebidas
  { name: 'coffee', icon: Coffee, label: 'Café' },
  { name: 'wine', icon: Wine, label: 'Vino' },
  { name: 'glass-water', icon: GlassWater, label: 'Agua' },
  { name: 'beer', icon: Beer, label: 'Cerveza' },
  { name: 'milk', icon: Milk, label: 'Leche' },
  { name: 'cup-soda', icon: CupSoda, label: 'Refresco' },
  { name: 'martini', icon: Martini, label: 'Martini' },

  // Comida rápida
  { name: 'pizza', icon: Pizza, label: 'Pizza' },
  { name: 'hamburger', icon: Hamburger, label: 'Hamburguesa' },
  { name: 'sandwich', icon: Sandwich, label: 'Sándwich' },
  { name: 'hot-dog', icon: Drumstick, label: 'Hot Dog' },
  { name: 'taco', icon: Utensils, label: 'Taco' },

  // Cocina y sopas
  { name: 'soup', icon: Soup, label: 'Sopa' },
  { name: 'cooking-pot', icon: CookingPot, label: 'Olla' },
  { name: 'chef-hat', icon: ChefHat, label: 'Chef' },
  { name: 'utensils-crossed', icon: UtensilsCrossed, label: 'Cubiertos' },

  // Postres y dulces
  { name: 'cake', icon: Cake, label: 'Pastel' },
  { name: 'chocolate', icon: CakeSlice, label: 'Chocolate' },
  { name: 'dessert', icon: Dessert, label: 'Postre' },
  { name: 'cookie', icon: Cookie, label: 'Galleta' },
  { name: 'donut', icon: Donut, label: 'Dona' },
  { name: 'ice-cream', icon: IceCream, label: 'Helado' },
  { name: 'ice-cream-cone', icon: IceCreamCone, label: 'Cono' },
  { name: 'ice-cream-bowl', icon: IceCreamBowl, label: 'Helado en vaso' },
  { name: 'popsicle', icon: Popsicle, label: 'Paleta' },
  { name: 'candy', icon: Candy, label: 'Dulce' },
  { name: 'candy-cane', icon: CandyCane, label: 'Caramelo' },
  { name: 'lollipop', icon: Lollipop, label: 'Chupeta' },

  // Panadería
  { name: 'croissant', icon: Croissant, label: 'Croissant' },
  { name: 'bread', icon: Wheat, label: 'Pan' },
  { name: 'egg', icon: Egg, label: 'Huevo' },
  { name: 'egg-fried', icon: EggFried, label: 'Huevo frito' },

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
  { name: 'leafy-green', icon: LeafyGreen, label: 'Verduras' },
  { name: 'nut', icon: Nut, label: 'Frutos secos' },

  // Carnes y pescados
  { name: 'drumstick', icon: Drumstick, label: 'Pollo' },
  { name: 'steak', icon: Beef, label: 'Carne' },
  { name: 'fish', icon: Fish, label: 'Pescado' },
  { name: 'shrimp', icon: Shrimp, label: 'Camarón' },
  { name: 'ham', icon: Ham, label: 'Jamón' },
  { name: 'slice', icon: Slice, label: 'Rebanada' },

  // Frío / congelados
  { name: 'snowflake', icon: Snowflake, label: 'Congelado' },
  { name: 'thermometer-snowflake', icon: ThermometerSnowflake, label: 'Refrigerado' },

  // Marcas / Shopping
  { name: 'shopping-cart', icon: ShoppingCart, label: 'Carrito' },
  { name: 'shopping-bag', icon: ShoppingBag, label: 'Bolsa' },
  { name: 'shopping-basket', icon: ShoppingBasket, label: 'Canasta' },
  { name: 'wallet', icon: Wallet, label: 'Billetera' },
  { name: 'credit-card', icon: CreditCard, label: 'Tarjeta' },
  { name: 'tag', icon: Tag, label: 'Etiqueta' },
  { name: 'tags', icon: Tags, label: 'Etiquetas' },
  { name: 'scale', icon: Scale, label: 'Balanza' },
  { name: 'weight', icon: Weight, label: 'Peso' },

  // Naturaleza
  { name: 'leaf', icon: Leaf, label: 'Hoja' },
  { name: 'flower', icon: Flower2, label: 'Flor' },
  { name: 'tree', icon: TreePine, label: 'Árbol' },

  // Especiales / destacados
  { name: 'sparkles', icon: Sparkles, label: 'Especiales' },
  { name: 'star', icon: Star, label: 'Estrella' },
  { name: 'heart', icon: Heart, label: 'Favorito' },
  { name: 'flame', icon: Flame, label: 'Picante' },
]

// Grid de ~80 iconos, memoizado aparte: sin esto, cada tecla en nombre/descripción
// (o el toggle de `loading` al guardar) reconstruye las 80 celdas con sus SVG de
// lucide-react en cada render del modal - carísimo y evitable, ya que el grid solo
// depende de cuál icono está seleccionado.
const IconGrid = memo(function IconGrid({ selectedIcon, onSelect }) {
  return (
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
          onClick={() => onSelect(iconName)}
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
  )
})

/**
 * Modal para crear una nueva categoría.
 * Gestiona su propio estado de texto internamente
 * y delega la lógica de guardado a onSave.
 */
function CategoryModal({ onSave, onClose, category }) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || 'package')
  const [loading, setLoading] = useState(false)
  const isEditing = !!category

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave({
        id: category?.id,
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
          <h3 className="modal-title">{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
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
              <IconGrid selectedIcon={selectedIcon} onSelect={setSelectedIcon} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              <Save size={18} />
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { ICON_OPTIONS }
export default CategoryModal

