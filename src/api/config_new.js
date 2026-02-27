const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

// Obtener token del localStorage
const getToken = () => localStorage.getItem('invleo_token');

// Guardar token
const setToken = (token) => {
  localStorage.setItem('invleo_token', token);
};

// Guardar usuario
const setUser = (user) => {
  localStorage.setItem('invleo_user', JSON.stringify(user));
};

// Obtener usuario - con manejo de errores
const getUser = () => {
  try {
    const user = localStorage.getItem('invleo_user');
    if (!user || user === 'undefined') return null;
    return JSON.parse(user);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

// Limpiar sesión
const clearSession = () => {
  localStorage.removeItem('invleo_token');
  localStorage.removeItem('invleo_user');
  localStorage.removeItem('invleo_logged_in');
};

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
    const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
    throw new Error(error.message || 'Error en la solicitud');
  }
  
  return response.json();
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
  
  searchByBarcode: (code) => apiRequest(`/products/barcode/${code}`),
};

// API Categorías
export const categoriesAPI = {
  getAll: () => apiRequest('/categories'),
  
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

// API Clientes
export const customersAPI = {
  getAll: () => apiRequest('/customers'),
  
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
  registerPayment: (id, data) => apiRequest(`/customers/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getBalance: (id) => apiRequest(`/customers/${id}/balance`),
  
  getCreditSales: (id) => apiRequest(`/customers/${id}/credit-sales`),
  
  getWithCredit: () => apiRequest('/customers/with-credit/list'),
  
  updateCreditLimit: (id, creditLimit) => apiRequest(`/customers/${id}/credit-limit`, {
    method: 'PUT',
    body: JSON.stringify({ credit_limit: creditLimit }),
  }),
};


export { getToken, setToken, setUser, getUser, clearSession, API_URL };
