# Punto Fresco — Frontend (Contexto para agentes)

> Contexto del repositorio **frontend** (`inventorySalesSystemFront`, rama `invSalesFrontEnd`). Léelo antes de trabajar aquí. Para el producto completo, ver también el contexto del backend y la landing. Última actualización: septiembre 2026.

---

## Qué es este repo

Interfaz web de **Punto Fresco**, SaaS POS/inventario para salsamentarías colombianas. Consume la API del backend. Multi-tenant: cada usuario pertenece a un negocio (tenant), salvo el superadmin.

## Stack

- **React 18 + Vite**
- **React Query** (`@tanstack/react-query`) para datos del servidor
- **React Router** para navegación
- **SweetAlert2** para confirmaciones, **lucide-react** para íconos, **Recharts** para gráficos
- **Vitest + React Testing Library** para tests (`npm run test:run`)

## Arranque local

```bash
npm install          # primera vez
npm run dev          # levanta Vite (puerto 5173)
npm run test:run     # corre los tests una vez
```

Para trabajar necesitas el **backend corriendo** (que a su vez necesita Redis). El front solo no basta para probar features con datos.

## Estructura

- `src/components/` — por dominio: `sales/`, `inventory/`, `reports/`, `settings/`, `shared/`, `admin/`, `layout/`, `billing/`
- `src/hooks/queries/` — hooks de datos con React Query (useProducts, useSales, useRecipes, useTransform, useAdminTenants, etc.)
- `src/hooks/` — hooks de UI/estado (useCart, useCashRegister, useToasts, etc.)
- `src/api/config.js` — capa API: objetos (productsAPI, inventoryAPI, recipesAPI, adminAPI...) con métodos que usan `apiRequest`. Base `API_URL` desde `VITE_API_URL`.
- `src/context/` — GlobalContext (currentUser, addToast, cart, etc.)
- `src/utils/` — lógica pura testeada: measurements, permissions, expiration, csvUtils, cartStorage, salesLogic
- `src/test/setup.js` — setup de Vitest (jest-dom)
- `main.jsx` — punto de entrada; monta rutas. La ruta `/customer` (pantalla cliente) vive aquí, fuera del AppLayout.

## Vistas principales (rutas)

Dashboard `/`, Inventario `/inventory`, Ventas/POS `/sales`, Reportes `/reports`, Configuración `/settings`, Crédito `/credit-accounts`, Billing `/billing/*`, y admin (solo superadmin): Suscripciones `/admin/tenants`, Auditoría `/admin/audit`. Pantalla cliente: `/customer` (ventana aparte).

## Features construidas

- POS con carrito, pago efectivo/crédito, cuadre de caja, turnos por cajero.
- **Venta por libra** (unidad canónica: `lb`, sin conversión kg).
- **Despiece** (`TransformModal`) manual + con recetas. **Gestor de recetas** (`RecipeManagerModal` + `RecipeFormModal`, CRUD completo).
- Código de barras en ventas (input que actúa como el lector-teclado → `productsAPI.searchByBarcode`).
- **Pantalla cliente** en tiempo real: `/customer` monta `CustomerDisplayPage`, que escucha el carrito por **`BroadcastChannel('pos-customer-display')`** emitido desde SalesView.
- Inventario con lotes/vencimientos, crédito, reportes.
- **Panel admin** (superadmin): `AdminTenantsView` (activar/suspender suscripciones) y `AdminAuditView` (auditoría paginada con filtros).

## Tests (~77, Vitest)

- Utils (lógica pura): measurements (14), permissions (16), expiration (13), csvUtils (9), cartStorage (6), salesLogic (13).
- Componentes: ProductGrid (5) — primer test de componente (render + interacción con `fireEvent`).
- Convención: tests de utils `.test.js`; tests de componentes `.test.jsx`.
- Regla de RTL aprendida: `getByText` espera UNO; si hay varios usar `getAllByText`.

## Decisiones y reglas clave

- **Todo en libras.** El default de nuevos productos es `unit: 'lb'`. `getWeightSaleUnit` devuelve la unidad del producto SIN invertir (antes convertía kg↔lb y duplicaba el precio — bug corregido). No hay selector kg/lb en el carrito.
- **Stock:** el POS oculta productos en stock 0 (`filteredProducts` filtra `hasStock`). Al ajustar peso, si se pide más de lo disponible, se recorta (`clampQuantity`) y se avisa con toast. La validación dura está en el back.
- **Refresco tras venta:** `useSalesMutations` invalida `['products']` (además de sales/dashboard/customers) para que el stock baje en pantalla al instante.
- **Suscripción vencida:** el modal ya NO ofrece pago automático; dice "contacta al administrador" (gestión manual).
- **God component SalesView** (era 774 líneas) refactorizado: lógica → `salesLogic.js`; subcomponentes → `CashRegisterStatus.jsx`, `ProductGrid.jsx`. No sobre-refactorizar: extraer solo lo cohesivo.
- **Permisos:** `can(user, permission)` en `utils/permissions.js`. El item de menú admin usa `permission: 'canManageAllTenants'` (solo superadmin lo ve).
- **Patrón CSS recurrente:** `.form-select`/`.form-input` (con `width:100%`) junto a un botón dentro de flex → colapsa. Solución: CSS Grid `gridTemplateColumns:'1fr auto'` (o `minWidth:0` en el flex item + `flexShrink:0` en el botón).

## Notas prácticas

- Al conectar un modal nuevo en una vista: import componente + import icono lucide + `useState showXModal` + botón (en Fragment `<>`) + render condicional. `addToast` viene de `useGlobalContext`.
- React Query: mutación `update` recibe UN argumento → usar `{id, data}`.
- Archivos muertos → archivar a `_legacy/` (en `.gitignore`), no borrar a lo loco (aunque git guarda el historial).

## Pendientes

- Más tests de componentes (modales con validación, CashRegisterStatus).
- Ensayo general end-to-end.
- Pasar productos de prueba viejos de kg a lb.
- Ajustes finales de la landing (repo aparte: `webAppSaas`).

## Estilo de trabajo

- Planear antes de codear, verificar cada paso, entender el "por qué".
- Commits desde terminal Ubuntu (WSL2), Conventional Commits.
- Investigar antes de asumir (diagnóstico con datos).