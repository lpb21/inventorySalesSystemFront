const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

// Obtener token del localStorage
const getToken = () => localStorage.getItem('invah_token');

// Guardar token
const setToken = (token) => {
  localStorage.setItem('invah_token', token);
};

// Guardar usuario
const setUser = (user) => {
  localStorage.setItem('invah_user', JSON.stringify(user));
};

// Obtener usuario - con manejo de errores
const getUser = () => {
  try {
    const user = localStorage.getItem('invah_user');
    if (!user || user === 'undefined') return null;
    return JSON.parse(user);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

// Limpiar sesión
const clearSession = () => {
  localStorage.removeItem('invah_token');
  localStorage.removeItem('invah_user');
  localStorage.removeItem('invah_logged_in');
};

// Función auxiliar para normalizar respuestas exitosas del backend
// Unifica el patrón response.data || response en un solo lugar
const normalizeSuccessResponse = (body) => {
  // Muchos endpoints envían { data: ... }, otros envían directamente el recurso
  return body && (body.data !== undefined ? body.data : body)
}

// Funciones auxiliares para listas/colecciones
// Devuelven siempre un array, usando claves comunes como fallback
const normalizeList = (body, possibleKeys = []) => {
  const data = normalizeSuccessResponse(body)

  if (Array.isArray(data)) return data

  const keys = [...possibleKeys, 'items', 'results', 'rows', 'list']
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }

  // Si nada coincide, devolver array vacío para evitar errores en los componentes
  return []
}

// Callback global para errores de plan/límite (registrado por GlobalContext)
let _planErrorHandler = null
export const registerPlanErrorHandler = (handler) => { _planErrorHandler = handler }

// Función genérica para hacer requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))

    if (response.status === 403 && _planErrorHandler) {
      const message = body?.error?.message || body?.message
      if (message) _planErrorHandler(message)
    }

    const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
    error.response = { status: response.status, data: body }
    throw error
  }
  
  // Para respuestas exitosas devolvemos SIEMPRE el body normalizado
  // (data || body) para evitar repetir este patrón en componentes/hooks
  const body = await response.json().catch(() => ({}))
  
  
  const normalized = normalizeSuccessResponse(body);
  
  return normalized;
};

// API Auth
export const authAPI = {
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  register: (data) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  me: () => apiRequest('/auth/me'),

  logout: () => {
    clearSession();
  },

  // Cambiar contraseña propia
  changePassword: (data) => apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Resetear contraseña de otro usuario (solo owner/superadmin)
  resetPassword: (userId, data) => apiRequest(`/auth/reset-password/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// API Turnos de Caja
export const cashRegistersAPI = {
  // Abrir nuevo turno
  open: (data) => apiRequest('/cash-registers/open', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Ver mi turno activo
  getMyActive: () => apiRequest('/cash-registers/my-active'),

  // Ver todos los turnos activos (admin)
  getAllActive: () => apiRequest('/cash-registers/active'),

  // Cerrar turno
  close: (shiftId, data) => apiRequest(`/cash-registers/${shiftId}/close`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Ver ventas de un turno
  getSales: (shiftId) => apiRequest(`/cash-registers/${shiftId}/sales`),
};

// API Productos
export const productsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => apiRequest(`/products/${id}`),
  
  create: (data) => apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(`/products/${id}`, {
    method: 'DELETE',
  }),
  
  getLowStock: () => apiRequest('/products/low-stock'),

  // Productos próximos a vencer (30 días)
  getExpiringSoon: () => apiRequest('/products/expiring-soon'),

  // Productos ya vencidos
  getExpired: () => apiRequest('/products/expired'),

  searchByBarcode: (code) => apiRequest(`/products/barcode/${code}`),

  // Importar productos desde CSV
  importFromCSV: async (formData) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/products/import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body?.error?.message || body?.message || 'Error al importar productos');
      err.response = { status: response.status, data: body };
      throw err;
    }
    
    return response.json();
  },
};

// API Categorías
export const categoriesAPI = {
  getAll: () => apiRequest('/categories?include_inactive=false'),
  
  getAllWithInactive: () => apiRequest('/categories?include_inactive=true'),
  
  getById: (id) => apiRequest(`/categories/${id}`),
  
  create: (data) => apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(`/categories/${id}`, {
    method: 'DELETE',
  }),
  
  deactivate: (id) => apiRequest(`/categories/${id}`, {
    method: 'DELETE',
  }),
  
  reactivate: (id) => apiRequest(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_active: true }),
  }),
};

// API Inventario
export const inventoryAPI = {
  getAll: () => apiRequest('/inventory'),
  
  adjust: (data) => apiRequest('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getMovements: (productId) => apiRequest(`/inventory/movements${productId ? `/${productId}` : ''}`),
  
  bulkAdjust: (data) => apiRequest('/inventory/bulk-adjust', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Registrar salidas de inventario (vencidos, dañados, devueltos)
  createOutput: (data) => apiRequest('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify({
      product_id: data.product_id,
      quantity: data.quantity,
      type: data.output_type === 'return' ? 'return' : 'waste',
      reason: data.notes || data.reason || ''
    }),
  }),
};

// API Ventas
export const salesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/sales${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => apiRequest(`/sales/${id}`),
  
  create: (data) => apiRequest('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  cancel: (id, reason) => apiRequest(`/sales/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  
  getToday: () => apiRequest('/sales/today'),
  
  getByDate: (startDate, endDate) => apiRequest(`/sales/by-date?start_date=${startDate}&end_date=${endDate}`),
};

// API Reportes
export const reportsAPI = {
  getDashboard: () => apiRequest('/reports/dashboard'),
  
  getSales: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/sales${query ? `?${query}` : ''}`);
  },
  
  getInventory: () => apiRequest('/reports/inventory'),
  
  getProfits: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/profits${query ? `?${query}` : ''}`);
  },
  
  getTopProducts: () => apiRequest('/reports/top-products'),
  
  getLowStock: () => apiRequest('/reports/low-stock'),
  
  getLowRotation: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/low-rotation${query ? `?${query}` : ''}`);
  },
};

// API Usuarios
export const usersAPI = {
  getAll: () => apiRequest('/users'),
  
  getById: (id) => apiRequest(`/users/${id}`),
  
  create: (data) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE',
  }),
  
  toggleStatus: (id) => apiRequest(`/users/${id}/toggle-status`, {
    method: 'PUT',
  }),
  
  resetPassword: (id, newPassword) => apiRequest(`/users/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ password: newPassword }),
  }),
};

// API Empresa
export const tenantAPI = {
  getCurrent: () => apiRequest('/tenants/current'),
  
  update: (data) => apiRequest('/tenants/current', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  getSubscription: () => apiRequest('/tenants/current/subscription'),
  
  // Gestión de tenants (para superadmin)
  getAll: () => apiRequest('/tenants'),
  
  create: (data) => apiRequest('/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getById: (id) => apiRequest(`/tenants/${id}`),
  
  delete: (id) => apiRequest(`/tenants/${id}`, {
    method: 'DELETE',
  }),
};

// API Configuración
export const settingsAPI = {
  get: () => apiRequest('/settings'),
  
  update: (data) => apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  getBusiness: () => apiRequest('/settings/business'),
  
  updateBusiness: (data) => apiRequest('/settings/business', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// API Suppliers/Proveedores
export const suppliersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/suppliers${query ? `?${query}` : ''}`);
  },
  
  getAllActive: () => apiRequest('/suppliers?include_inactive=false'),
  
  getAllWithInactive: () => apiRequest('/suppliers?include_inactive=true'),
  
  getSelect: () => apiRequest('/suppliers/select'),
  
  getById: (id) => apiRequest(`/suppliers/${id}`),
  
  create: (data) => apiRequest('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(`/suppliers/${id}`, {
    method: 'DELETE',
  }),
  
  deactivate: (id) => apiRequest(`/suppliers/${id}/toggle-status`, {
    method: 'PATCH',
  }),
  
  reactivate: (id) => apiRequest(`/suppliers/${id}/toggle-status`, {
    method: 'PATCH',
  }),
  
  toggleStatus: (id) => apiRequest(`/suppliers/${id}/toggle-status`, {
    method: 'PATCH',
  }),
};

// API Clientes
export const customersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => apiRequest(`/customers/${id}`),
  
  create: (data) => apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(`/customers/${id}`, {
    method: 'DELETE',
  }),
  
  // Endpoints de crédito/fiado
  registerPayment: async (id, data) => {
    // Para registerPayment, necesitamos la respuesta completa para mostrar el mensaje
    const token = getToken();
    const response = await fetch(`${API_URL}/customers/${id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body?.error?.message || body?.message || 'Error al registrar pago');
      err.response = { status: response.status, data: body };
      throw err;
    }

    // Devolver la respuesta completa sin normalizar para preservar el mensaje
    return await response.json();
  },
  
  getBalance: (id) => apiRequest(`/customers/${id}/balance`),
  
  getCreditSales: (id) => apiRequest(`/customers/${id}/credit-sales`),
  
  getWithCredit: () => apiRequest('/customers/with-credit/list'),
  
  updateCreditLimit: (id, creditLimit) => apiRequest(`/customers/${id}/credit-limit`, {
    method: 'PUT',
    body: JSON.stringify({ credit_limit: creditLimit }),
  }),
};


// Helpers exportados para que los componentes/hooks puedan normalizar colecciones
// sin duplicar lógica (por ejemplo, listas de productos, ventas, usuarios, etc.).
export const ApiNormalizers = {
  normalizeSuccessResponse,
  normalizeList,
}

export { getToken, setToken, setUser, getUser, clearSession, API_URL };
