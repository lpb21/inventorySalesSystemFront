# Guía de Recuperación y Cambio de Contraseñas

Esta guía explica cómo gestionar contraseñas en el sistema invLeo, incluyendo cambio de contraseña propia y reseteo de contraseñas por administradores.

## Tabla de Contenidos

1. [Métodos Disponibles](#métodos-disponibles)
2. [Cambio de Contraseña Propia](#cambio-de-contraseña-propia)
3. [Reseteo de Contraseña por Admin](#reseteo-de-contraseña-por-admin)
4. [Seguridad](#seguridad)
5. [Frontend - Ejemplos de Integración](#frontend---ejemplos-de-integración)
6. [Casos de Uso](#casos-de-uso)
7. [Troubleshooting](#troubleshooting)

---

## Métodos Disponibles

El sistema ofrece **dos métodos** para gestionar contraseñas:

### 1. Cambio de Contraseña Propia
**Quién:** Cualquier usuario autenticado
**Endpoint:** `POST /v1/auth/change-password`
**Requiere:** Contraseña actual + nueva contraseña

### 2. Reseteo por Administrador
**Quién:** Usuarios con rol `owner` o `superadmin`
**Endpoint:** `POST /v1/auth/reset-password/:userId`
**Requiere:** Solo nueva contraseña (no necesita la actual)

---

## Cambio de Contraseña Propia

Permite a cualquier usuario cambiar su propia contraseña conociendo la actual.

### Endpoint

```
POST /v1/auth/change-password
```

**Autenticación:** Requerida (JWT Token)

### Request Body

```json
{
  "current_password": "mi_contraseña_actual",
  "new_password": "mi_nueva_contraseña_segura"
}
```

### Validaciones

- ✅ `current_password`: Requerido, mínimo 6 caracteres
- ✅ `new_password`: Requerido, mínimo 6 caracteres, debe ser diferente a la actual
- ✅ Usuario debe estar autenticado (token válido)
- ✅ Contraseña actual debe ser correcta

### Response Exitosa (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Contraseña actualizada correctamente"
  }
}
```

### Errores Posibles

**401 Unauthorized - Contraseña actual incorrecta**
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "La contraseña actual es incorrecta",
    "statusCode": 401
  }
}
```

**400 Bad Request - Nueva contraseña inválida**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La nueva contraseña debe tener al menos 6 caracteres",
    "statusCode": 400
  }
}
```

**400 Bad Request - Contraseñas iguales**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La nueva contraseña debe ser diferente a la actual",
    "statusCode": 400
  }
}
```

### Ejemplo con curl

```bash
curl -X POST http://localhost:3000/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "current_password": "oldpass123",
    "new_password": "newpass456"
  }'
```

### Ejemplo con JavaScript/Fetch

```javascript
async function cambiarMiContraseña(currentPassword, newPassword) {
  try {
    const response = await fetch('/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Contraseña actualizada correctamente');
    } else {
      alert(`Error: ${data.error.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cambiar la contraseña');
  }
}

// Uso
cambiarMiContraseña('oldpass123', 'newpass456');
```

---

## Reseteo de Contraseña por Admin

Permite a usuarios con rol **owner** o **superadmin** resetear la contraseña de cualquier usuario del sistema.

### Endpoint

```
POST /v1/auth/reset-password/:userId
```

**Autenticación:** Requerida (JWT Token)
**Autorización:** Solo `owner` o `superadmin`

### Parámetros de URL

- `userId` (UUID): ID del usuario cuya contraseña se va a resetear

### Request Body

```json
{
  "new_password": "nueva_contraseña_temporal"
}
```

### Validaciones

- ✅ `new_password`: Requerido, mínimo 6 caracteres
- ✅ Usuario admin debe ser `owner` o `superadmin`
- ✅ Owner solo puede resetear usuarios de su mismo tenant
- ✅ Superadmin puede resetear cualquier usuario
- ✅ No se puede resetear la contraseña de otro superadmin (a menos que seas superadmin)

### Response Exitosa (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Contraseña de Juan Pérez (juan@example.com) actualizada correctamente",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    }
  }
}
```

### Errores Posibles

**401 Unauthorized - Sin permisos**
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "No tienes permisos para resetear contraseñas",
    "statusCode": 401
  }
}
```

**401 Unauthorized - Diferente tenant**
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Solo puedes resetear contraseñas de usuarios de tu empresa",
    "statusCode": 401
  }
}
```

**400 Bad Request - Usuario no encontrado**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Usuario objetivo no encontrado",
    "statusCode": 400
  }
}
```

### Ejemplo con curl

```bash
# Resetear contraseña de un usuario específico
curl -X POST http://localhost:3000/v1/auth/reset-password/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -d '{
    "new_password": "temporal123"
  }'
```

### Ejemplo con JavaScript/Fetch

```javascript
async function resetearContraseña(userId, newPassword) {
  try {
    const response = await fetch(`/v1/auth/reset-password/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        new_password: newPassword
      })
    });

    const data = await response.json();

    if (data.success) {
      alert(`Contraseña reseteada: ${data.data.message}`);
      console.log('Usuario afectado:', data.data.user);
    } else {
      alert(`Error: ${data.error.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al resetear la contraseña');
  }
}

// Uso
const userId = '123e4567-e89b-12d3-a456-426614174000';
resetearContraseña(userId, 'temporal123');
```

---

## Seguridad

### Reglas de Contraseñas

**Mínimo de caracteres:** 6
**Recomendado:** 8+ caracteres con mayúsculas, minúsculas, números y símbolos

### Hashing

Las contraseñas se almacenan usando **bcrypt** con factor de costo 12:
- Antes de crear usuario: hash automático
- Antes de actualizar contraseña: hash automático
- No se almacenan contraseñas en texto plano

### Permisos y Restricciones

| Acción | Usuario Normal | Owner | Superadmin |
|--------|---------------|-------|------------|
| Cambiar su propia contraseña | ✅ | ✅ | ✅ |
| Resetear contraseña de su tenant | ❌ | ✅ | ✅ |
| Resetear contraseña de otro tenant | ❌ | ❌ | ✅ |
| Resetear contraseña de superadmin | ❌ | ❌ | ✅ |

### Validaciones de Negocio

1. **Cambio propio**: Usuario debe conocer contraseña actual
2. **Reseteo admin**: Solo owner/superadmin pueden resetear
3. **Mismo tenant**: Owner solo puede afectar usuarios de su empresa
4. **Protección superadmin**: Solo superadmin puede resetear otro superadmin
5. **Contraseña diferente**: Nueva contraseña debe ser distinta a la actual

---

## Frontend - Ejemplos de Integración

### Componente React - Cambio de Contraseña Propia

```jsx
import React, { useState } from 'react';

function CambiarContraseña() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validación frontend
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await fetch('/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Contraseña actualizada correctamente');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    }
  };

  return (
    <div className="cambiar-contraseña">
      <h2>Cambiar mi Contraseña</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Contraseña Actual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label>Nueva Contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label>Confirmar Nueva Contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button type="submit">Cambiar Contraseña</button>
      </form>
    </div>
  );
}

export default CambiarContraseña;
```

### Componente React - Reseteo por Admin

```jsx
import React, { useState } from 'react';

function ResetearContraseña({ user, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await fetch(`/v1/auth/reset-password/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Contraseña de ${user.name} reseteada correctamente. Nueva contraseña: ${newPassword}`);
        setShowModal(false);
        setNewPassword('');
        if (onSuccess) onSuccess();
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Resetear Contraseña
      </button>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Resetear Contraseña</h3>
            <p>Usuario: {user.name} ({user.email})</p>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-group">
              <label>Nueva Contraseña Temporal</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ej: temporal123"
                minLength={6}
              />
              <small>El usuario deberá cambiarla después de iniciar sesión</small>
            </div>

            <div className="modal-actions">
              <button onClick={handleReset}>Confirmar Reset</button>
              <button onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResetearContraseña;
```

---

## Casos de Uso

### Caso 1: Usuario olvida su contraseña

**Flujo:**
1. Usuario contacta al administrador (owner) de su empresa
2. Administrador accede al panel de usuarios
3. Administrador busca al usuario y hace clic en "Resetear Contraseña"
4. Administrador establece contraseña temporal (ej: "temp123456")
5. Administrador comunica la contraseña temporal al usuario (por teléfono, WhatsApp, etc.)
6. Usuario inicia sesión con la contraseña temporal
7. Sistema recomienda cambiar la contraseña inmediatamente
8. Usuario usa `/v1/auth/change-password` para establecer su propia contraseña

### Caso 2: Usuario quiere cambiar su contraseña por seguridad

**Flujo:**
1. Usuario accede a "Mi Perfil" o "Configuración"
2. Hace clic en "Cambiar Contraseña"
3. Ingresa contraseña actual y nueva contraseña
4. Sistema valida y actualiza la contraseña
5. Usuario recibe confirmación

### Caso 3: Empleado deja la empresa

**Flujo:**
1. Administrador desactiva la cuenta del usuario
2. (Opcional) Administrador resetea la contraseña como medida de seguridad adicional

```javascript
// Desactivar usuario
await fetch(`/v1/users/${userId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ is_active: false })
});
```

### Caso 4: Superadmin resetea cuenta de owner

**Flujo:**
1. Superadmin recibe solicitud de owner que olvidó contraseña
2. Superadmin accede al panel de administración global
3. Busca al owner por email o empresa
4. Resetea la contraseña
5. Comunica credenciales temporales al owner de forma segura

---

## Troubleshooting

### Error: "No tienes permisos para resetear contraseñas"

**Causa:** El usuario no tiene rol `owner` o `superadmin`

**Solución:** Solo usuarios con estos roles pueden resetear contraseñas de otros usuarios.

### Error: "Solo puedes resetear contraseñas de usuarios de tu empresa"

**Causa:** Un owner está intentando resetear la contraseña de un usuario de otro tenant

**Solución:** Los owner solo pueden gestionar usuarios de su propia empresa. Contacta a un superadmin.

### Error: "La contraseña actual es incorrecta"

**Causa:** Al cambiar la contraseña propia, la contraseña actual ingresada no es correcta

**Solución:** Verifica que estás ingresando la contraseña correcta. Si la olvidaste, solicita un reseteo a tu administrador.

### Error: "La nueva contraseña debe ser diferente a la actual"

**Causa:** Estás intentando establecer la misma contraseña que ya tienes

**Solución:** Elige una contraseña diferente.

### Error: "Usuario objetivo no encontrado"

**Causa:** El userId proporcionado no existe o es inválido

**Solución:** Verifica que el ID del usuario sea correcto (debe ser un UUID válido).

### Error: "No puedes resetear la contraseña de un superadmin"

**Causa:** Un owner está intentando resetear la contraseña de un superadmin

**Solución:** Solo un superadmin puede resetear la contraseña de otro superadmin.

---

## Mejoras Futuras (Opcional)

Si en el futuro deseas implementar recuperación por email, necesitarás:

1. **Servicio de email** (SendGrid, Resend, Mailgun)
2. **Tabla de tokens de recuperación**
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```
3. **Endpoints adicionales**:
   - `POST /v1/auth/forgot-password` - Solicitar reseteo
   - `POST /v1/auth/reset-password-token` - Resetear con token

---

## Resumen de Endpoints

| Método | Endpoint | Requiere Auth | Roles | Descripción |
|--------|----------|---------------|-------|-------------|
| POST | `/v1/auth/change-password` | ✅ | Todos | Cambiar contraseña propia |
| POST | `/v1/auth/reset-password/:userId` | ✅ | owner, superadmin | Resetear contraseña de otro usuario |

---

**Implementación completada**: Sistema de gestión de contraseñas listo para usar! 🔒
