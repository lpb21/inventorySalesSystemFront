# Implementación de Funcionalidad de Suppliers/Proveedores

## ✅ Funcionalidades Implementadas

### 1. API de Suppliers
- **Archivo**: `src/api/config.js`
- **Endpoints agregados**:
  - `GET /v1/suppliers` - Listar proveedores con paginación y filtros
  - `GET /v1/suppliers/select` - Proveedores para dropdown/select  
  - `POST /v1/suppliers` - Crear nuevo proveedor
  - `GET /v1/suppliers/:id` - Ver proveedor específico + productos
  - `PUT /v1/suppliers/:id` - Actualizar proveedor
  - `DELETE /v1/suppliers/:id` - Eliminar proveedor (soft delete)

### 2. Hook useSuppliers
- **Archivo**: `src/hooks/useSuppliers.js`
- **Funciones**:
  - `saveSupplier()` - Crear/actualizar proveedores
  - `deleteSupplier()` - Eliminar con confirmación y manejo de errores

### 3. Componente SupplierModal
- **Archivo**: `src/components/inventory/SupplierModal.jsx`
- **Campos del formulario**:
  - Nombre del proveedor (obligatorio)
  - Nombre de contacto
  - Documento/RUC
  - Email (con validación)
  - Teléfono
  - Dirección
  - Notas
- **Características**:
  - Validación de campos
  - Manejo de estados de carga
  - Diseño responsive

### 4. Vista de Gestión de Suppliers
- **Archivo**: `src/components/inventory/SuppliersView.jsx`
- **Funcionalidades**:
  - Grid responsivo de proveedores
  - Búsqueda por nombre, contacto o email
  - Información completa de cada proveedor
  - Botones de editar/eliminar
  - Estado vacío cuando no hay proveedores
  - Permisos de usuario integrados

### 5. Integración con GlobalContext
- **Archivo**: `src/context/GlobalContext.jsx`
- **Agregado**:
  - State para `suppliers`
  - Función `loadSuppliers()`
  - Status de carga para suppliers
  - Carga automática al hacer login

### 6. Actualización de ProductModal
- **Archivo**: `src/components/inventory/ProductModal.jsx`
- **Mejoras**:
  - Campo de selección de proveedor
  - Botón "Nuevo" para crear proveedores
  - Opción "Sin proveedor" disponible
  - Integración con SupplierModal

### 7. Integración con InventoryView
- **Archivo**: `src/components/inventory/InventoryView.jsx`
- **Cambios**:
  - Import del hook useSuppliers
  - Import de SupplierModal
  - Manejo de estado para suppliers
  - Pasado de suppliers a ProductModal
  - Modal de SupplierModal integrado

### 8. Importación CSV con Suppliers
- **Archivo**: `src/components/inventory/ImportModal.jsx`
- **Nueva funcionalidad**:
  - Función `ensureSuppliersExist()` - Crea proveedores automáticamente
  - Actualizada estructura CSV esperada
  - Header aliases para "proveedor", "supplier", etc.
  - Lógica de creación automática de proveedores inexistentes
  - Ejemplo CSV actualizado

### 9. Archivo de Ejemplo CSV
- **Archivo**: `ejemplo_importacion_productos.csv`
- **Nueva estructura**:
```csv
name,category,supplier,description,sku,price,cost,stock
"Monitor Samsung 24","Tecnología","Samsung Electronics","Monitor LED",MON-SAM-24,299.99,220.00,15
```

## 🔄 Lógica de Importación de Suppliers

1. **Si el proveedor existe** → Se asocia automáticamente al producto
2. **Si no existe** → Se crea automáticamente con:
   - name: nombre del CSV
   - contact_name: null
   - document: null  
   - email: null
3. **Si está vacío** → Producto queda sin proveedor (supplier_id: null)

## 📊 Flujo de Importación Actualizado

1. **Validación de estructura CSV** - Incluye campo supplier opcional
2. **Procesamiento de categorías** - Crea categorías faltantes
3. **Procesamiento de suppliers** - Crea proveedores faltantes (NUEVO)
4. **Importación de productos** - Con suppliers ya creados

## 🎯 Uso de las Nuevas Funcionalidades

### Para crear un proveedor:
```javascript
// Desde ProductModal
onAddSupplier() // Abre SupplierModal

// Directamente
<SuppliersView /> // Vista completa de gestión
```

### Para importar con suppliers:
```csv
name,category,supplier,description,sku,price,cost,stock
"Producto","Categoría","Proveedor Nuevo","Desc",SKU001,10.00,7.50,100
```

### Para crear producto con proveedor:
```json
{
  "name": "Monitor Samsung 24",
  "supplier_id": "uuid-del-proveedor",
  "price": 299.99,
  "cost": 220.00
}
```

## 🔧 Permisos Utilizados

- **canEditProducts**: Permite crear/editar suppliers
- **canDeleteProducts**: Permite eliminar suppliers

## 📁 Archivos Modificados/Creados

### Nuevos:
- `src/hooks/useSuppliers.js`
- `src/components/inventory/SupplierModal.jsx` 
- `src/components/inventory/SuppliersView.jsx`

### Modificados:
- `src/api/config.js`
- `src/context/GlobalContext.jsx`
- `src/components/inventory/ProductModal.jsx`
- `src/components/inventory/InventoryView.jsx`
- `src/components/inventory/ImportModal.jsx`
- `ejemplo_importacion_productos.csv`

## 🚀 Próximos Pasos Recomendados

1. **Agregar la ruta para SuppliersView** en el sistema de navegación
2. **Agregar contador de productos** por supplier en el backend
3. **Implementar filtros avanzados** en SuppliersView
4. **Agregar exportación** de suppliers a CSV
5. **Implementar búsqueda global** de suppliers desde otros módulos

Todas las funcionalidades están completamente integradas y listas para usar. El sistema ahora maneja suppliers de forma completa y coherente con el resto de la aplicación.