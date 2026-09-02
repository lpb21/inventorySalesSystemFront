# Punto Fresco — Contexto del Proyecto
 
> Documento de contexto para cualquier agente de IA, desarrollador o colaborador que se sume al proyecto. Explica qué es, cómo está construido, qué decisiones se tomaron y en qué estado está. Última actualización: septiembre 2026.
 
---
 
## 1. Qué es
 
**Punto Fresco** es un SaaS de **punto de venta (POS) e inventario especializado para salsamentarías** (tiendas colombianas de embutidos, quesos, carnes frías y pollo). Es un producto multi-tenant: cada negocio (tenant) tiene sus propios datos aislados.
 
**Propuesta de valor / diferenciador:** a diferencia de los POS genéricos (Alegra, Siigo, Treinta, Loyverse), Punto Fresco entiende el negocio de perecederos: venta por peso/libra, **despiece** (convertir un producto en varios cortes), control de lotes y vencimientos, y merma. Ese es el foso competitivo.
 
**Público:** salsamentarías pequeñas en Colombia (arranque). A futuro, negocios más grandes / multi-sucursal.
 
---
 
## 2. Modelo de negocio (decisiones tomadas)
 
- **Modelo de cobro: por tiempo, NO por funcionalidad (modelo A).** Todos los clientes reciben TODAS las funciones. Se cobra por el período contratado. Es el gancho comercial: "todo incluido, sin planes que te limitan".
- **Períodos:** trial (7 días gratis), mensual, trimestral, semestral, anual. Con descuento creciente por compromiso.
- **Precios (COP):** Mensual $50.000 · Trimestral $135.000 (−10%) · Semestral $255.000 (−15%) · Anual $480.000 (−20%, "2 meses gratis").
- **Precio de fundador** (opcional, para los primeros ~10 clientes): tarifa especial congelada a cambio de feedback/testimonios.
- **Gestión de suscripciones: MANUAL** vía panel de superadmin (activar/suspender). NO hay pago automático (ePayco quedó descartado; el modal de "ir a pagar" fue reemplazado por "contacta al administrador").
- **Nota sobre planes técnicos:** el backend TIENE infraestructura de planes por funcionalidad (`plans.js` con free/basic/pro/enterprise, límites y `planMiddleware`), construida antes de decidir el modelo A. Está "dormida": para el modelo A se asigna `enterprise` a todos (todas las features en `true`). Se puede "despertar" en el futuro si se quiere diferenciar por volumen.
---
 
## 3. Arquitectura y repos
 
Tres repositorios (GitHub, usuario `lpb21`):
 
1. **Backend:** `inventorySalesSystemBack` (rama `invSalesBackend`)
   - Node.js + Express, Sequelize (ORM), PostgreSQL (Supabase), Redis (caché).
   - JWT + RBAC, multi-tenant con aislamiento por `tenant_id`.
   - 44 tests (Jest), 9 archivos. Migraciones versionadas (Umzug).
   - Listo para producción: health check, errores endurecidos, guía `DEPLOY.md` (EC2 + Nginx + PM2 + SSL).
2. **Frontend:** `inventorySalesSystemFront` (rama `invSalesFrontEnd`)
   - React 18 + Vite, React Query, React Router, SweetAlert2, lucide-react.
   - ~77 tests (Vitest + React Testing Library): utils (measurements, permissions, expiration, csv, cartStorage, salesLogic) + primer test de componente (ProductGrid).
3. **Landing:** `webAppSaas` — este repo. Un solo `index.html` (HTML/CSS/JS puro, sin framework). Diseño cálido naranja/marrón.
---
 
## 4. Funcionalidades construidas (estado ~94%)
 
**Core (funcionando):**
- Punto de venta (POS) con carrito, pago efectivo/crédito, cuadre de caja y turnos por cajero.
- Venta por peso en **libras** (unidad canónica del negocio; sin conversión kg — todo es lb).
- **Despiece / transformación:** convertir un producto (ej. pollo entero) en varios cortes (pechuga, alas...). Con merma libre.
- **Recetas de despiece:** plantillas que pre-llenan los cortes (CRUD completo desde la UI). Receta = 1 unidad de origen.
- Inventario con lotes, fechas de vencimiento y alertas.
- Código de barras (lector = teclado; endpoint `GET /v1/products/barcode/:code`).
- **Pantalla cliente** en tiempo real (ventana aparte, vía `BroadcastChannel`).
- Crédito y cuentas por cobrar.
- Reportes y cortes mensuales (los "avanzados" gated por `advancedReports` en el plan).
- **Panel de superadmin:** gestión de suscripciones (listar tenants + activar/suspender) y auditoría global (paginada + filtros por tenant y acción).
**Pendiente (Fase 2 / post-lanzamiento):**
- **Facturación electrónica DIAN** (obligatoria en Colombia; es el pendiente #1). Se comunica como "próximamente, sin costo adicional".
- Separar ambientes dev/prod (2 Supabase + EC2).
- Ensayo general end-to-end.
- Más tests de componentes.
- Landing: ajustes finales.
- Deudas técnicas menores: flag `is_global` para el tenant admin (hoy se filtra por nombre), costeo automático del despiece.
---
 
## 5. Decisiones y aprendizajes clave
 
- **Todo en libras (lb)** como unidad canónica. Cero conversión kg. El default de nuevos productos es `lb`.
- **Seguridad multicapa para stock:** el backend valida stock insuficiente (imposible vender de más); el front avisa con toast y oculta productos en stock 0 del POS.
- **El precio SIEMPRE viene de la BD** en la venta, nunca del cliente (seguridad).
- **Superadmin** tiene `tenant_id = NULL` y se excluye del listado de suscripciones (no puede autosuspenderse; protege la cuenta maestra).
- **Auditoría:** cada acción (venta, activación, suspensión, etc.) queda registrada en `audit_logs` con quién/qué/cuándo. Paginada para escalar.
- **God component refactorizado:** `SalesView` se adelgazó extrayendo lógica pura (`salesLogic`) y subcomponentes (`CashRegisterStatus`, `ProductGrid`).
- **Patrón CSS recurrente:** un `.form-select`/`.form-input` (que traen `width:100%`) junto a un botón, dentro de flex, colapsa. Solución: CSS Grid con `gridTemplateColumns:'1fr auto'`.
---
 
## 6. Estilo de trabajo del equipo
 
- Planear antes de codear, verificar cada paso, entender el "por qué".
- Commits desde terminal Ubuntu (WSL2), formato Conventional Commits.
- Tests como red de seguridad antes de refactorizar.
- No sobre-refactorizar: extraer solo lo cohesivo, parar a tiempo.
- Investigar antes de asumir (diagnóstico con datos, no adivinar).
---
 
## 7. Competencia (referencia de mercado colombiano 2026)
 
- **Genéricos:** Alegra ($25.900+/mes), Siigo, Loggro ($108.990+), Treinta ($39.900), Loyverse (freemium), POS Colombia ($39.900+).
- **Especializados en perecederos:** GridPOS ($19.900–$100.000/mes), Galaxia, SIKI, Merlín.
- **Ninguno de los genéricos** ofrece bien venta por peso + despiece + lotes/vencimientos → ahí está la oportunidad de Punto Fresco.
- La **facturación electrónica DIAN** ya es obligatoria (Documento Equivalente Electrónico POS, vigencia escalonada 2024-2025) — de ahí que sea el pendiente #1.