# TODO - Gestión de Usuarios

## Plan de Implementación

- [x] 1. Agregar estado `users` y función `loadUsers()` en App.jsx
- [x] 2. Importar `usersAPI` de config.js
- [x] 3. Agregar estado para modal de usuarios (`showUserModal`)
- [x] 4. Agregar función `saveUser` para crear nuevos usuarios
- [x] 5. Modificar `SettingsView` para incluir sección de gestión de usuarios
- [x] 6. Crear componente `UserModal` para el formulario de usuario
- [x] 7. Agregar permisos `canManageUsers` para admin y owner

## Funcionalidades Implementadas

1. **Nueva sección "Gestión de Usuarios"** en Configuración (solo visible para admin/owner)
2. **Lista de usuarios** con información de nombre, email, rol, estado y fecha de creación
3. **Botón "Nuevo Usuario"** que abre un modal
4. **Modal de usuario** con formulario que incluye:
   - Nombre completo
   - Correo electrónico
   - Contraseña
   - Rol (Cajero, Supervisor, Administrador, Propietario)
   - Checkbox de usuario activo
5. **Integración con endpoint** `POST /v1/users` del backend
