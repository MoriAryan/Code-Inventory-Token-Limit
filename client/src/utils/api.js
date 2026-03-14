const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getToken, setToken, clearToken,
  // Auth
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  requestOtp: (email) => request('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  // Products
  getProducts: (params = '') => request(`/products${params ? '?' + params : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/products/categories/list'),
  createCategory: (body) => request('/products/categories', { method: 'POST', body: JSON.stringify(body) }),
  // Warehouses
  getWarehouses: () => request('/warehouses'),
  createWarehouse: (body) => request('/warehouses', { method: 'POST', body: JSON.stringify(body) }),
  updateWarehouse: (id, body) => request(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getLocations: (whId) => request(`/warehouses/${whId}/locations`),
  getAllLocations: () => request('/warehouses/locations/all'),
  createLocation: (body) => request('/warehouses/locations', { method: 'POST', body: JSON.stringify(body) }),
  getSuppliers: () => request('/warehouses/suppliers'),
  createSupplier: (body) => request('/warehouses/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  getCustomers: () => request('/warehouses/customers'),
  createCustomer: (body) => request('/warehouses/customers', { method: 'POST', body: JSON.stringify(body) }),
  // Receipts
  getReceipts: (params = '') => request(`/receipts${params ? '?' + params : ''}`),
  getReceipt: (id) => request(`/receipts/${id}`),
  createReceipt: (body) => request('/receipts', { method: 'POST', body: JSON.stringify(body) }),
  updateReceipt: (id, body) => request(`/receipts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  validateReceipt: (id) => request(`/receipts/${id}/validate`, { method: 'POST' }),
  // Deliveries
  getDeliveries: (params = '') => request(`/deliveries${params ? '?' + params : ''}`),
  getDelivery: (id) => request(`/deliveries/${id}`),
  createDelivery: (body) => request('/deliveries', { method: 'POST', body: JSON.stringify(body) }),
  updateDelivery: (id, body) => request(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  validateDelivery: (id) => request(`/deliveries/${id}/validate`, { method: 'POST' }),
  // Transfers
  getTransfers: (params = '') => request(`/transfers${params ? '?' + params : ''}`),
  getTransfer: (id) => request(`/transfers/${id}`),
  createTransfer: (body) => request('/transfers', { method: 'POST', body: JSON.stringify(body) }),
  validateTransfer: (id) => request(`/transfers/${id}/validate`, { method: 'POST' }),
  // Adjustments
  getAdjustments: (params = '') => request(`/adjustments${params ? '?' + params : ''}`),
  createAdjustment: (body) => request('/adjustments', { method: 'POST', body: JSON.stringify(body) }),
  // Dashboard & Ledger
  getDashboard: (params = '') => request(`/dashboard${params ? '?' + params : ''}`),
  getLedger: (params = '') => request(`/ledger${params ? '?' + params : ''}`),
};
