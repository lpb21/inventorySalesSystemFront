# 🔧 Troubleshooting - Importación CSV

## ✅ Implementación Simplificada (ACTUALIZADO)

Se ha simplificado a **un solo endpoint** que responde con SSE directamente:

### 🎯 Flujo Simplificado

```
1. POST /v1/products/import con FormData + Authorization header
   ↓
2. La misma respuesta es un stream SSE que envía eventos:
   - { status: 'connected', importId, total, message }
   - { status: 'processing', progress, processed, successCount, errorCount, message }
   - { status: 'completed', progress: 100, successCount, errorCount, results }
   ↓
3. Se actualiza la UI en tiempo real
   ↓
4. Al recibir status === 'completed', se cierra el stream y muestra resultado
```

### ✅ Ventajas

- ✅ **Un solo endpoint**: No más endpoint separado para progreso
- ✅ **Más simple**: Menos código, menos complejidad
- ✅ **Más rápido**: No hay latencia entre POST y GET
- ✅ **Headers funcionan**: fetch permite enviar Authorization

### 🔧 Detalles Técnicos

El POST devuelve directamente `Content-Type: text/event-stream` y mantiene la conexión abierta enviando eventos SSE.

## 🔍 Pasos para Diagnosticar el Problema

### 1. Verifica la consola del navegador

Abre DevTools (F12) y busca estos mensajes:

```
[Importar CSV] POST con SSE directo: http://localhost:3000/v1/products/import
[Importar CSV] Conexión SSE establecida, leyendo stream...
[Importar CSV] Chunk recibido, buffer length: xxx
[Importar CSV] Procesando X líneas del buffer
[Importar CSV] Evento recibido: {status: 'connected', importId: '...', total: 100}
[Importar CSV] Conexión establecida: Importación iniciada
[Importar CSV] Evento recibido: {status: 'processing', progress: 20, processed: 1, ...}
[Importar CSV] Evento recibido: {status: 'processing', progress: 40, processed: 2, ...}
...
[Importar CSV] Evento recibido: {status: 'completed', progress: 100, ...}
[Importar CSV] ✅ Importación completada: {...}
```

### 2. Verifica la pestaña Network

En DevTools → Network:

1. **Busca la petición POST a `/products/import`**
   - ✅ Status: 200
   - ✅ Type: `text/event-stream` o `fetch`
   - ✅ Headers Request: `Authorization: Bearer token`
   - ✅ Headers Response: `Content-Type: text/event-stream`
   - ⏱️ La conexión debe permanecer abierta (pending) mientras procesa

2. **Ya NO debe existir un GET separado** `/products/import/progress/:importId`

### 3. Problemas Comunes y Soluciones

#### ❌ Error 401/403 en el POST

**Causa**: El token no es válido o no se está enviando

**Verifica**:
- Que `getToken()` devuelve el token correctamente
- En Network → Request Headers debe aparecer: `Authorization: Bearer tu_token`

#### ❌ La conexión se cierra inmediatamente

**Causa**: El backend no está configurado para mantener la conexión abierta

**Verifica en el backend**:
```javascript
// Debe configurar headers SSE
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});

// NO debe llamar res.json() ni res.end() hasta terminar
```

#### ❌ No se reciben eventos de progreso

**Causa**: El backend no está enviando eventos en formato SSE correcto

**Formato esperado** (nota las dos líneas en blanco al final):
```
data: {"status":"connected","importId":"abc","total":100}

data: {"status":"processing","progress":20,"processed":1}

data: {"status":"completed","progress":100}

```

Cada evento debe:
1. Empezar con `data: `
2. Contener JSON válido
3. Terminar con dos saltos de línea (`\n\n`)

#### ❌ Error: "No se han recibido eventos en 60000 ms"

**Causa**: El proceso está tardando mucho o se quedó congelado

**Solución**:
- Archivos grandes: Divide el CSV en partes más pequeñas
- Verifica que el backend no tenga errores que detengan el procesamiento

### 4. Verifica el Backend

```bash
# Prueba el endpoint POST que devuelve SSE directamente
curl -N -X POST http://localhost:3000/v1/products/import \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "file=@productos.csv"

# Debe devolver eventos SSE como:
# data: {"status":"connected","importId":"abc","total":5,"message":"Importación iniciada"}
# 
# data: {"status":"processing","progress":20,"processed":1,"total":5,"successCount":1,"errorCount":0}
# 
# data: {"status":"processing","progress":40,"processed":2,"total":5,"successCount":2,"errorCount":0}
# 
# data: {"status":"completed","progress":100,"processed":5,"total":5,"successCount":5,"errorCount":0,"results":{...}}
# 
```

**Importante**: 
- Usa `-N` para deshabilitar buffering y ver eventos en tiempo real
- La conexión debe permanecer abierta hasta recibir `status: 'completed'`

### 5. Verifica el archivo .env

Asegúrate de que existe `.env` con:
```env
VITE_API_URL=http://localhost:3000/v1
```

Si cambias el .env, **reinicia el servidor de Vite**:
```bash
# Detén el servidor (Ctrl+C) y vuelve a iniciarlo
npm run dev
```

## 📝 Formato del CSV Esperado

```csv
name,description,sku,barcode,category,price,cost,stock,min_stock,unit,type,expiry_date
"Arroz Diana 500g","Arroz blanco premium","ARZ001","789123456001","Granos",2500,1800,50,10,"und","unit","2025-12-31"
```

Columnas obligatorias:
- `name` (nombre del producto)

Columnas opcionales pero recomendadas:
- `description`, `sku`, `barcode`, `category`, `price`, `cost`, `stock`, `min_stock`, `unit`, `type`, `expiry_date`

## 🚀 Próximos Pasos

1. **Intenta importar de nuevo** y revisa los logs en consola (F12)
2. **Si ves `[Importar CSV] Conexión SSE establecida`** → El POST fue exitoso ✅
3. **Si ves eventos `{status: 'connected'}`** → Conectado correctamente ✅
4. **Si ves eventos `{status: 'processing'}`** → Recibiendo progreso ✅
5. **Si ves `✅ Importación completada`** → ¡Funcionó perfectamente! 🎉
6. **Si no ves estos mensajes**, revisa la sección de problemas comunes arriba

## 🔧 Detalles Técnicos

### ¿Por qué esta implementación es mejor?

**Arquitectura anterior (2 endpoints):**
```
POST /products/import → { importId }
  ↓
GET /products/import/progress/:importId → SSE
```
❌ Más complejo  
❌ Dos peticiones  
❌ Posible race condition

**Arquitectura actual (1 endpoint):**
```
POST /products/import → SSE directo
```
✅ Más simple  
✅ Una sola petición  
✅ Sin race conditions  
✅ Menos latencia

### Implementación Técnica

```javascript
// POST que devuelve SSE directamente
const response = await fetch('/v1/products/import', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData  // FormData con el archivo
});

// Leer el stream SSE
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  
  // Procesar líneas que empiezan con "data: "
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      
      if (event.status === 'completed') {
        // ¡Completado!
        break;
      }
    }
  }
}
```

### Manejo de Estados

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `connected` | Conexión establecida | Guardar `total`, mostrar mensaje |
| `processing` | Procesando productos | Actualizar barra de progreso y contadores |
| `completed` | Importación finalizada | Mostrar resultado, cerrar stream |
| `error` | Error durante importación | Mostrar error, cerrar stream |

## 💡 Tips Adicionales

- **Archivos grandes**: Si tienes más de 1000 productos, considera dividir el CSV en archivos más pequeños
- **Encoding**: Asegúrate de que el CSV esté en UTF-8
- **Caracteres especiales**: Las comillas dentro de campos deben escaparse: `"Producto ""especial"""`
- **Categorías**: Si usas la columna `category`, deben existir previamente en el sistema

---

¿Necesitas más ayuda? Comparte los mensajes de consola y el contenido del Network tab.
