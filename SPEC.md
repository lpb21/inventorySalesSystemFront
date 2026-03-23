# SPEC.md - Sistema de Inventarios invah

## 1. Project Overview

**Project Name:** invah  
**Type:** Single Page Application (React)  
**Core Functionality:** Sistema completo de gestión de inventarios para salsamentaría con venta de productos al despiece y porcionados, módulo de ventas, y pantalla de visualización para clientes.  
**Target Users:** Dueños de salsamentaría, cajeros, administradores

---

## 2. UI/UX Specification

### Layout Structure

**Main Application (Business View):**
- **Header:** Logo, navigation tabs, user info, date/time
- **Sidebar:** Quick actions and category navigation
- **Main Content:** Dynamic based on selected module
- **Footer:** Status bar with connection info

**Customer Display Screen:**
- Full-screen product showcase
- Large text for visibility
- Auto-refreshing product list
- Promotional messages support

### Responsive Breakpoints
- Desktop: 1200px+ (primary target)
- Tablet: 768px - 1199px
- Mobile: < 768px (limited support)

### Visual Design

**Color Palette:**
- Primary: `#1a1a2e` (Deep Navy)
- Secondary: `#16213e` (Dark Blue)
- Accent: `#e94560` (Coral Red - for important actions)
- Success: `#00d9a5` (Mint Green)
- Warning: `#ffc107` (Amber)
- Background: `#0f0f1a` (Near Black)
- Surface: `#1f1f3a` (Card Background)
- Text Primary: `#ffffff`
- Text Secondary: `#a0a0b0`
- Border: `#2a2a4a`

**Typography:**
- Font Family: "Outfit" (headings), "DM Sans" (body)
- Headings: 700 weight
- H1: 32px, H2: 24px, H3: 20px, H4: 16px
- Body: 400 weight, 14px
- Small: 12px

**Spacing System:**
- Base unit: 8px
- XS: 4px, SM: 8px, MD: 16px, LG: 24px, XL: 32px, XXL: 48px

**Visual Effects:**
- Card shadows: `0 4px 20px rgba(0, 0, 0, 0.3)`
- Hover transitions: 200ms ease
- Button hover: scale(1.02) + glow effect
- Glass morphism on modals: backdrop-filter blur(10px)

### Components

**Navigation:**
- Tab-based navigation with icons
- Active state: accent color underline + background highlight
- Hover: subtle background change

**Cards:**
- Product cards with image, name, price, stock
- Category cards with icon and count
- Stat cards with trend indicators

**Buttons:**
- Primary: Coral red background, white text
- Secondary: Transparent with border
- Icon buttons: Circular, 40px
- States: hover (glow), active (pressed), disabled (opacity 0.5)

**Forms:**
- Input fields: Dark background, light border, focus glow
- Select dropdowns: Custom styled
- Search: With icon prefix

**Tables:**
- Striped rows, hover highlight
- Sortable headers
- Pagination controls

**Modals:**
- Centered, glass morphism background
- Close button top-right
- Action buttons at bottom

---

## 3. Functionality Specification

### Core Features

#### A. Dashboard (Panel Principal)
- Resumen de ventas del día
- Productos con stock bajo (alertas)
- Productos más vendidos
- Gráfico de ventas semanal
- Acceso rápido a acciones principales

#### B. Gestión de Inventario
- **Catálogo de Productos:**
  - Nombre, categoría, unidad de medida
  - Precio de compra y venta
  - Stock actual, stock mínimo
  - Estado: activo/inactivo
  - Imagen del producto
  
- **Categorías:**
  - Carnes Frías (jamón, tocino, mortadela, etc.)
  - Pollo (entero, partes, molido)
  - Quesos (fresco, maduro, rallado)
  - Embutidos (salchicha, chorizo, longaniza)
  - Otros (condimentos, complementos)

- **Tipos de Producto:**
  - Por peso (kg, lb)
  - Por unidad
  - Al despiece (se divide en porciones)

- **Operaciones:**
  - Agregar nuevo producto
  - Editar producto
  - Eliminar producto
  - Ajustar inventario (entrada/salida)
  - Ver historial de movimientos

#### C. Módulo de Ventas
- **Punto de Venta (POS):**
  - Búsqueda rápida de productos
  - Agregar productos al carrito
  - Seleccionar cantidad (peso o unidades)
  - Aplicar descuentos
  - Calculadora de cambio
  - Ticket de venta
  
- **Gestión de Pedidos:**
  - Pedidos en proceso
  - Historial de ventas
  - Cancelación de ventas (con autorización)

#### D. Pantalla de Cliente (Visor)
- Vista de productos disponibles
- Precios visibles
- Promociones del día
- Mensaje de bienvenida personalizable
- Diseño optimizado para TV/pantalla grande

#### E. Reportes
- Ventas por período
- Inventario actual
- Productos más vendidos
- Ganancias y pérdidas
- Exportar a PDF/Excel

#### F. Configuración
- Datos del negocio
- Usuarios y permisos
- Categorías
- Impuestos
- Impresora (configuración)
- Backup de datos

### User Interactions

- **Búsqueda:** Ctrl+K para búsqueda global
- **Atajos:** 
  - F2: Nueva venta
  - F3: Inventario
  - F4: Dashboard
  - Esc: Cerrar modales
- **Gestos:** Soporte para tablet (swipe entre secciones)

### Data Handling
- LocalStorage para persistencia de datos
- Datos de ejemplo precargados
- Exportación/importación JSON

### Edge Cases
- Stock en cero: mostrar alerta, impedir venta
- Precio no definido: mostrar mensaje
- Producto no encontrado: sugerencia de búsqueda
- Conexión perdida: modo offline con sincronización

---

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Tema oscuro con acentos en coral/rojo
- [ ] Tipografía legible en pantalla
- [ ] Iconos consistentes (Lucide React)
- [ ] Animaciones suaves en transiciones
- [ ] Diseño responsive

### Functional Checkpoints
- [ ] CRUD completo de productos
- [ ] Sistema de ventas funcional
- [ ] Pantalla de cliente independiente
- [ ] Alertas de stock bajo
- [ ] Persistencia de datos
- [ ] Navegación fluida entre módulos

### Technical Checkpoints
- [ ] React con componentes funcionales
- [ ] Hooks para gestión de estado
- [ ] Estilos con CSS Modules o styled-components
- [ ] Sin errores en consola
- [ ] Build exitoso
