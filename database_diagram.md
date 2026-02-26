# 🗄️ invLeo — Diagrama Entidad-Relación

Base de datos PostgreSQL · Arquitectura multi-tenant

```mermaid
erDiagram
    TENANTS {
        uuid id PK
        string name
        string email
        string plan
        string subscription_status
        string stripe_customer_id
        string stripe_subscription_id
        timestamp trial_ends_at
        timestamp created_at
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string email
        string password_hash
        string role
        boolean active
        timestamp created_at
    }

    SUPPLIERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string contact_name
        string phone
        string email
        string notes
        boolean active
    }

    CATEGORIES {
        uuid id PK
        uuid tenant_id FK
        string name
        string icon
        boolean active
    }

    PRODUCTS {
        uuid id PK
        uuid tenant_id FK
        uuid category_id FK
        uuid supplier_id FK
        string name
        string unit
        string type
        decimal price
        decimal cost
        decimal stock
        decimal min_stock
        string barcode
        date expiry_date
        boolean active
        timestamp created_at
    }

    CUSTOMERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string phone
        string email
        string notes
        timestamp created_at
    }

    CASH_REGISTERS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        decimal opening_amount
        decimal closing_amount
        decimal expected_amount
        string status
        timestamp opened_at
        timestamp closed_at
    }

    SALES {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid customer_id FK
        uuid cash_register_id FK
        string ticket_number
        decimal subtotal
        decimal discount
        decimal tax
        decimal total
        decimal profit
        string payment_method
        decimal amount_received
        decimal change_given
        string note
        string status
        timestamp created_at
    }

    SALE_ITEMS {
        uuid id PK
        uuid sale_id FK
        uuid product_id FK
        decimal quantity
        decimal price_at_sale
        decimal cost_at_sale
        decimal subtotal
    }

    INVENTORY_MOVEMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid product_id FK
        uuid user_id FK
        string type
        decimal quantity
        decimal stock_before
        decimal stock_after
        string reason
        string reference_id
        timestamp created_at
    }

    TENANTS ||--o{ USERS : "tiene"
    TENANTS ||--o{ SUPPLIERS : "registra"
    TENANTS ||--o{ CATEGORIES : "define"
    TENANTS ||--o{ PRODUCTS : "maneja"
    TENANTS ||--o{ CUSTOMERS : "atiende"
    TENANTS ||--o{ CASH_REGISTERS : "opera"
    TENANTS ||--o{ SALES : "genera"
    TENANTS ||--o{ INVENTORY_MOVEMENTS : "audita"
    CATEGORIES ||--o{ PRODUCTS : "clasifica"
    SUPPLIERS ||--o{ PRODUCTS : "suministra"
    USERS ||--o{ SALES : "realiza"
    USERS ||--o{ CASH_REGISTERS : "abre"
    USERS ||--o{ INVENTORY_MOVEMENTS : "ejecuta"
    CUSTOMERS ||--o{ SALES : "compra"
    CASH_REGISTERS ||--o{ SALES : "contiene"
    SALES ||--o{ SALE_ITEMS : "detalla"
    PRODUCTS ||--o{ SALE_ITEMS : "incluido_en"
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "registra"
```

---

## Leyenda de relaciones

| Símbolo | Significado |
|---|---|
| `\|\|` | Exactamente uno |
| `o{` | Cero o muchos |
| `\|\|--o{` | Uno a muchos |

## Tipos de movimientos de inventario (`type`)

| Valor | Descripción |
|---|---|
| `sale` | Salida por venta |
| `purchase` | Entrada por compra a proveedor |
| `adjustment` | Ajuste manual |
| `waste` | Merma / pérdida |
| `return` | Devolución de cliente |

## Roles de usuario (`role`)

| Valor | Permisos |
|---|---|
| `admin` | Acceso total al negocio |
| `cashier` | Solo POS y consulta de inventario |
| `viewer` | Solo lectura / reportes |

## Estados de suscripción del tenant (`subscription_status`)

| Valor | Descripción |
|---|---|
| `trial` | Período de prueba gratuito |
| `active` | Suscripción activa y pagada |
| `past_due` | Pago fallido, acceso limitado |
| `cancelled` | Suscripción cancelada |
