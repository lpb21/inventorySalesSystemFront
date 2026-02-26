# Prompt para Desarrollo de Backend - invLeo SaaS

## Sistema de Gestión de Inventarios para Salsamentarías (SaaS)

---

## 1. Visión General del Proyecto

**Nombre del Proyecto:** invLeo Backend  
**Tipo de Aplicación:** SaaS (Software como Servicio) Multi-tenant  
**Stack Tecnológico:** Node.js con Express.js  
**Base de Datos:** PostgreSQL (recomendado para datos estructurados y multi-tenant)  
**Autenticación:** JWT (JSON Web Tokens)

### Descripción
Desarrollar el backend para un sistema de inventarios SaaS que permita a múltiples salsamentarías gestionar sus productos, ventas e inventarios de forma aislada. Cada cliente (salsamentaría) debe tener acceso únicamente a sus propios datos.

---

## 2. Arquitectura Multi-tenant (SaaS)

### Estrategia de Aislamiento
- **Modelo:** Row-level security (RLS) o esquema por cliente
- **Identificador de Tenant:** Cada request debe incluir el ID de la empresa (via header, token JWT o subdominio)
- **Middleware de Tenant:** Crear un middleware que valide y establezca el contexto del tenant para cada request

### Estructura de Base de Datos
```
┌─────────────────────────────────────────────────────────────┐
│                    ESQUEMA PRINCIPAL                        │
├─────────────────────────────────────────────────────────────┤
│  tenants (Empresas/Salsamentarías)                         │
│  ├── id: UUID (PK)                                         │
│  ├── name: VARCHAR(255)                                     │
│  ├── slug: VARCHAR(100) (identificador único)              │
│  ├── business_name: VARCHAR(255)                            │
│  ├── address: TEXT                                         │
│  ├── phone: VARCHAR(50)                                    │
│  ├── plan: VARCHAR(50) (free, basic, pro, enterprise)     │
│  ├── created_at: TIMESTAMP                                 │
│  └── updated_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  users (Usuarios por empresa)                              │
│  ├── id: UUID (PK)                                         │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── email: VARCHAR(255) (único por tenant)               │
│  ├── password_hash: VARCHAR(255)                           │
│  ├── name: VARCHAR(255)                                    │
│  ├── role: VARCHAR(50) (owner, admin, supervisor, cashier)│
│  ├── is_active: BOOLEAN                                    │
│  ├── last_login: TIMESTAMP                                 │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  categories (Categorías por empresa)                       │
│  ├── id: UUID (PK)                                         │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── name: VARCHAR(100)                                    │
│  ├── description: TEXT                                     │
│  ├── icon: VARCHAR(50)                                     │
│  ├── is_active: BOOLEAN                                    │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  products (Productos por empresa)                         │
│  ├── id: UUID (PK)                                         │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── name: VARCHAR(255)                                    │
│  ├── category_id: UUID (FK -> categories.id)              │
│  ├── description: TEXT                                     │
│  ├── sku: VARCHAR(50) (código interno)                    │
│  ├── barcode: VARCHAR(100)                                 │
│  ├── price: DECIMAL(12,2)                                  │
│  ├── cost: DECIMAL(12,2)                                   │
│  ├── stock: DECIMAL(12,3)                                  │
│  ├── min_stock: DECIMAL(12,3)                              │
│  ├── unit: VARCHAR(20) (kg, lb, und, paq)                 │
│  ├── type: VARCHAR(20) (weight, unit, portion)             │
│  ├── image_url: TEXT                                       │
│  ├── is_active: BOOLEAN                                    │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  inventory_movements (Historial de inventario)             │
│  ├── id: UUID (PK)                                        │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── product_id: UUID (FK -> products.id)                 │
│  ├── user_id: UUID (FK -> users.id)                       │
│  ├── type: VARCHAR(20) (in, out, adjustment, sale)        │
│  ├── quantity: DECIMAL(12,3)                               │
│  ├── previous_stock: DECIMAL(12,3)                        │
│  ├── new_stock: DECIMAL(12,3)                             │
│  ├── reason: TEXT                                          │
│  ├── reference_id: UUID (venta o ajuste relacionado)       │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  sales (Ventas por empresa)                                │
│  ├── id: UUID (PK)                                         │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── user_id: UUID (FK -> users.id)                        │
│  ├── customer_name: VARCHAR(255)                           │
│  ├── customer_document: VARCHAR(50)                        │
│  ├── subtotal: DECIMAL(12,2)                               │
│  ├── discount: DECIMAL(12,2)                               │
│  ├── tax: DECIMAL(12,2)                                    │
│  ├── total: DECIMAL(12,2)                                  │
│  ├── payment_method: VARCHAR(50) (cash, card, transfer)   │
│  ├── payment_received: DECIMAL(12,2)                      │
│  ├── change_given: DECIMAL(12,2)                           │
│  ├── status: VARCHAR(20) (completed, cancelled, refunded) │
│  ├── notes: TEXT                                           │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  sale_items (Items de cada venta)                         │
│  ├── id: UUID (PK)                                         │
│  ├── sale_id: UUID (FK -> sales.id)                        │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── product_id: UUID (FK -> products.id)                 │
│  ├── quantity: DECIMAL(12,3)                               │
│  ├── unit_price: DECIMAL(12,2)                             │
│  ├── total_price: DECIMAL(12,2)                           │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  customers (Clientes - opcional)                          │
│  ├── id: UUID (PK)                                         │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── name: VARCHAR(255)                                    │
│  ├── document: VARCHAR(50)                                 │
│  ├── email: VARCHAR(255)                                   │
│  ├── phone: VARCHAR(50)                                    │
│  ├── address: TEXT                                         │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  suppliers (Proveedores - opcional)                        │
│  ├── id: UUID (PK)                                         │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── name: VARCHAR(255)                                    │
│  ├── document: VARCHAR(50)                                 │
│  ├── email: VARCHAR(255)                                   │
│  ├── phone: VARCHAR(50)                                    │
│  ├── address: TEXT                                         │
│  └── created_at: TIMESTAMP                                 │
├─────────────────────────────────────────────────────────────┤
│  purchase_orders (Órdenes de compra - opcional)           │
│  ├── id: UUID (PK)                                        │
│  ├── tenant_id: UUID (FK -> tenants.id)                   │
│  ├── supplier_id: UUID (FK -> suppliers.id)               │
│  ├── status: VARCHAR(20) (pending, received, cancelled)   │
│  ├── total: DECIMAL(12,2)                                 │
│  ├── notes: TEXT                                           │
│  └── created_at: TIMESTAMP                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Autenticación y Autorización

### Sistema de Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **owner** | Acceso total, gestión de usuarios, configuración, reportes completos |
| **admin** | Gestión de productos, categorías, ventas, reportes |
| **supervisor** | Gestión de productos, ventas, reportes (sin ver costos) |
| **cashier** | Solo ventas, vista de solo lectura en inventario |

### Endpoints de Autenticación

```
POST   /api/auth/login              - Iniciar sesión
POST   /api/auth/register          - Registrar nueva empresa (solo para plan free)
POST   /api/auth/forgot-password    - Recuperar contraseña
POST   /api/auth/reset-password     - Restablecer contraseña
GET    /api/auth/me                 - Obtener usuario actual
POST   /api/auth/refresh-token      - Renovar token de acceso
POST   /api/auth/logout             - Cerrar sesión
```

### JWT Token Structure
```
json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "role": "admin",
  "email": "admin@mi-salsamentaria.com",
  "exp": 1715000000,
  "iat": 1714395200
}
```

---

## 4. Endpoints de la API REST

### Productos
```
GET    /api/products                - Listar productos (con paginación y filtros)
GET    /api/products/:id           - Obtener producto por ID
POST   /api/products               - Crear producto
PUT    /api/products/:id           - Actualizar producto
DELETE /api/products/:id           - Eliminar producto (soft delete)
GET    /api/products/low-stock     - Productos con stock bajo
GET    /api/products/barcode/:code - Buscar por código de barras
GET    /api/products/search        - Búsqueda avanzada
```

### Categorías
```
GET    /api/categories              - Listar categorías
POST   /api/categories             - Crear categoría
PUT    /api/categories/:id         - Actualizar categoría
DELETE /api/categories/:id         - Eliminar categoría
```

### Inventario
```
GET    /api/inventory              - Ver inventario actual
POST   /api/inventory/adjust       - Ajustar inventario (entrada/salida)
GET    /api/inventory/movements    - Historial de movimientos
GET    /api/inventory/movements/:productId - Movimientos de un producto
POST   /api/inventory/bulk-adjust  - Ajuste masivo de inventario
```

### Ventas (POS)
```
GET    /api/sales                  - Listar ventas
GET    /api/sales/:id             - Obtener venta por ID
POST   /api/sales                 - Crear nueva venta
POST   /api/sales/:id/cancel      - Cancelar venta
POST   /api/sales/:id/refund      - Realizar devolución
GET    /api/sales/today           - Ventas de hoy
GET    /api/sales/by-date         - Ventas por rango de fecha
GET    /api/sales/export          - Exportar ventas (PDF/Excel)
```

### Usuarios (Gestión por Tenant)
```
GET    /api/users                  - Listar usuarios de la empresa
POST   /api/users                  - Crear usuario
PUT    /api/users/:id              - Actualizar usuario
DELETE /api/users/:id             - Eliminar usuario
PUT    /api/users/:id/reset-password - Restablecer contraseña de usuario
PUT    /api/users/:id/toggle-status - Activar/desactivar usuario
```

### Reportes
```
GET    /api/reports/dashboard      - Datos para dashboard
GET    /api/reports/sales          - Reporte de ventas
GET    /api/reports/inventory      - Reporte de inventario
GET    /api/reports/profits        - Reporte de ganancias
GET    /api/reports/top-products   - Productos más vendidos
GET    /api/reports/low-stock      - Productos con stock bajo
GET    /api/reports/export         - Exportar reportes
```

### Configuración de la Empresa
```
GET    /api/settings               - Obtener configuración
PUT    /api/settings              - Actualizar configuración
GET    /api/settings/business      - Datos del negocio
PUT    /api/settings/business      - Actualizar datos del negocio
```

---

## 5. Middleware Requerido

### tenantMiddleware
```
javascript
// Valida que el usuario pertenece al tenant y establece el contexto
function tenantMiddleware(req, res, next) {
  const tenantId = req.user.tenantId;
  req.tenantId = tenantId;
  next();
}
```

### authMiddleware
```
javascript
// Valida el JWT token
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  // Validar token JWT
  // Adjuntar usuario al request
  next();
}
```

### permissionMiddleware
```
javascript
// Valida permisos según rol
function permissionMiddleware(requiredPermission) {
  return (req, res, next) => {
    const permissions = getPermissionsForRole(req.user.role);
    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}
```

### validationMiddleware
```
javascript
// Validación de datos de entrada
// Usar Joi o Zod para schemas de validación
```

---

## 6. Servicios (Business Logic)

### ProductService
```
javascript
class ProductService {
  async createProduct(tenantId, productData)
  async updateProduct(tenantId, productId, productData)
  async deleteProduct(tenantId, productId)
  async getProducts(tenantId, filters, pagination)
  async searchProducts(tenantId, query)
  async adjustStock(tenantId, productId, quantity, type, reason)
}
```

### SaleService
```
javascript
class SaleService {
  async createSale(tenantId, saleData, userId)
  async cancelSale(tenantId, saleId, userId, reason)
  async getSales(tenantId, filters)
  async getDailySales(tenantId)
  async calculateProfit(tenantId, dateRange)
}
```

### InventoryService
```
javascript
class InventoryService {
  async getInventory(tenantId, filters)
  async recordMovement(tenantId, movementData)
  async getMovements(tenantId, productId, dateRange)
  async getLowStockProducts(tenantId)
  async bulkAdjustStock(tenantId, adjustments, userId)
}
```

---

## 7. Consideraciones de Seguridad

### Rate Limiting
- Limitar requests por IP y por usuario
- Prevenir ataques de fuerza bruta en login

### Validación de Entrada
- Sanitizar todos los inputs
- Usar schemas de validación (Joi/Zod)

### Protección de Datos
- Hash de contraseñas con bcrypt (cost factor 12)
- HTTPS obligatorio en producción
- Headers de seguridad (helmet.js)

### Logs y Auditoría
- Registrar todas las acciones importantes
- Mantener logs de autenticación
- Alertas de actividades sospechosas

---

## 8. Paginación y Formato de Respuesta

### Formato Estándar de Respuesta
```
json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Manejo de Errores
```
json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensaje legible para el usuario",
    "details": [ ... ]
  }
}
```

---

## 9. Tecnologías Recomendadas

### Dependencias Principales
- **express** - Framework web
- **pg** / **sequelize** o **prisma** - ORM para PostgreSQL
- **jsonwebtoken** - Autenticación JWT
- **bcryptjs** - Hash de contraseñas
- **joi** o **zod** - Validación de datos
- **helmet** - Headers de seguridad
- **cors** - Configuración CORS
- **morgan** - Logging de requests
- **dotenv** - Variables de entorno
- **uuid** - Generación de IDs únicos

### Estructura de Proyecto Sugerida
```
src/
├── config/
│   ├── database.js
│   ├── redis.js
│   └── env.js
├── controllers/
│   ├── authController.js
│   ├── productController.js
│   ├── saleController.js
│   └── ...
├── middlewares/
│   ├── authMiddleware.js
│   ├── tenantMiddleware.js
│   ├── permissionMiddleware.js
│   └── validationMiddleware.js
├── models/
│   ├── Tenant.js
│   ├── User.js
│   ├── Product.js
│   └── ...
├── routes/
│   ├── authRoutes.js
│   ├── productRoutes.js
│   └── ...
├── services/
│   ├── authService.js
│   ├── productService.js
│   └── ...
├── utils/
│   ├── errors.js
│   ├── validators.js
│   └── helpers.js
├── app.js
└── server.js
```

---

## 10. Planes y Limitaciones (SaaS)

| Plan | Productos | Usuarios | Funcionalidades |
|------|-----------|----------|-----------------|
| Free | 100 | 1 | Básico |
| Basic | 500 | 3 | Inventario + Ventas |
| Pro | 2000 | 10 | Completo + Reportes |
| Enterprise | Ilimitado | Ilimitado | Todo + API + Soporte |

---

## 11. Consideraciones de Rendimiento

- **Índices:** Crear índices en columnas frecuentemente consultadas (tenant_id, category_id, barcode, created_at)
- **Caché:** Implementar Redis para datos frecuentemente accedidos
- **Conexiones:** Usar pool de conexiones a BD
- **Paginación:** Siempre paginar listados grandes
- **Webhooks:** Para sincronización en tiempo real con el frontend

---

## 12. Deployment

### Variables de Entorno Requeridas
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
REDIS_URL=redis://...
FRONTEND_URL=https://tu-dominio.com
```

### Contenedor Docker (Opcional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

Este prompt proporciona una guía completa para desarrollar el backend de invLeo como un SaaS multi-tenant. El desarrollo debe seguir las mejores prácticas de seguridad, rendimiento y escalabilidad.
