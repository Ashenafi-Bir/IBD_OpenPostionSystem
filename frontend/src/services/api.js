import axios from 'axios';
import { storage } from '../utils/storage';
import toast from 'react-hot-toast';

// Use Vite's env system
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Request queue management
let pendingRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue = [];

const processQueue = () => {
  if (pendingRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const { config, resolve } = requestQueue.shift();
  pendingRequests++;
  resolve(config);
};

// Create axios instance with better configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  maxContentLength: 50 * 1024 * 1024,
  maxRedirects: 5,
});

// Request interceptor to add auth token and manage concurrency
api.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add timestamp to avoid caching issues
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';

    return new Promise((resolve) => {
      if (pendingRequests < MAX_CONCURRENT_REQUESTS) {
        pendingRequests++;
        resolve(config);
      } else {
        requestQueue.push({ config, resolve });
      }
    });
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and manage queue
api.interceptors.response.use(
  (response) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    processQueue();
    return response;
  },
  (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    processQueue();

    if (error.code === 'ERR_NETWORK') {
      toast.error('Network error. Please check your connection.');
    } else if (error.response?.status === 401) {
      storage.removeToken();
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment.');
    } else if (error.response?.status !== 422) {
      const message = error.response?.data?.error || error.message;
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return {
      success: true,
      token: response.data.token,
      user: response.data.user
    };
  },
  getProfile: () => api.get('/auth/profile').then(res => res.data.user),
};


// User services
export const userService = {
  getUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};
// Currency services
export const currencyService = {
  getAll: () => api.get('/currencies').then(res => res.data),
  getById: (id) => api.get(`/currencies/${id}`).then(res => res.data),
  create: (data) => api.post('/currencies', data).then(res => res.data),
  update: (id, data) => api.put(`/currencies/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/currencies/${id}`).then(res => res.data),
};

// Daily Balance services
// Daily Balance services - UPDATED WITH BULK IMPORT
export const dailyBalanceService = {
  getBalances: (date) => 
    api.get(`/daily-balances?date=${date}`).then(res => res.data),
  
  getReports: (date) => 
    api.get(`/daily-balances/reports?date=${date}`).then(res => res.data),
  
  create: (data) => 
    api.post('/daily-balances', data).then(res => res.data),
  
  update: (id, data) => 
    api.put(`/daily-balances/${id}`, data).then(res => res.data),
  
  delete: (id) => 
    api.delete(`/daily-balances/${id}`).then(res => res.data),
  
  submit: (id) => 
    api.patch(`/daily-balances/${id}/submit`).then(res => res.data),
  
  authorize: (id) => 
    api.patch(`/daily-balances/${id}/authorize`).then(res => res.data),
  
  // NEW: Bulk import endpoint
  bulkImport: (data) => 
    api.post('/daily-balances/bulk-import', data).then(res => res.data),
};

// Correspondent Banking API - FIXED: Using api instance instead of axios directly
// In your api.js file, update the correspondentService.getBanks method
// In your api.js file, update the correspondentService
export const correspondentService = {
  // Bank Management - UPDATED WITH FULL CRUD
  createBank: (data) => 
    api.post('/correspondent/banks', data).then(res => res.data),
  
  // Update all bank fields, not just limits
  updateBank: (bankId, data) => 
    api.put(`/correspondent/banks/${bankId}`, data).then(res => res.data),
  
  // Keep updateBankLimits for backward compatibility if needed
  updateBankLimits: (bankId, data) => 
    api.patch(`/correspondent/banks/${bankId}/limits`, data).then(res => res.data),
  
  // Add delete bank endpoint
  deleteBank: (bankId) => 
    api.delete(`/correspondent/banks/${bankId}`).then(res => res.data),
  
  getBanks: (currencyId = null) => {
    const params = currencyId ? { currencyId } : {};
    return api.get('/correspondent/banks', { params }).then(res => res.data);
  },

  // Balance Management
  addDailyBalance: (data) => 
    api.post('/correspondent/balances', data).then(res => res.data),
    // NEW: Bulk import balances
  bulkImportBalances: (data) => 
    api.post('/correspondent/balances/bulk-import', data).then(res => res.data),
  
  getBankBalances: (bankId, params = {}) => 
    api.get(`/correspondent/banks/${bankId}/balances`, { params }).then(res => res.data),

  // Reports
  getLimitsReport: (date, options = {}) => 
    api.get('/correspondent/reports/limits', { 
      params: { date },
      ...options 
    }).then(res => res.data),
  
  getCashCoverReport: (date, options = {}) => 
    api.get('/correspondent/reports/cash-cover', { 
      params: { date },
      ...options 
    }).then(res => res.data),

  // Alerts
  getActiveAlerts: (date = null) => {
    const params = date ? { date } : {};
    return api.get('/correspondent/alerts', { params }).then(res => res.data);
  },
  
  resolveAlert: (alertId) => 
    api.patch(`/correspondent/alerts/${alertId}/resolve`).then(res => res.data),
};
// Transaction services
export const transactionService = {
  create: (data) => 
    api.post('/transactions', data).then(res => res.data),
  
  authorize: (id) => 
    api.patch(`/transactions/${id}/authorize`).then(res => res.data),
  
  submit: (id) => 
    api.patch(`/transactions/${id}/submit`).then(res => res.data),
  
  update: (id, data) => 
    api.put(`/transactions/${id}`, data).then(res => res.data),
  
  getList: (params) => 
    api.get('/transactions', { params }).then(res => res.data),
};

// Exchange Rate services
export const exchangeRateService = {
  getRates: (date) => 
    api.get(`/exchange-rates${date ? `?date=${date}` : ''}`).then(res => res.data),
  
  create: (data) => 
    api.post('/exchange-rates', data).then(res => res.data),
  
  update: (id, data) => 
    api.put(`/exchange-rates/${id}`, data).then(res => res.data),
  
  delete: (id) => 
    api.delete(`/exchange-rates/${id}`).then(res => res.data),
};

// Balance Item services
export const balanceItemService = {
  getItems: () => 
    api.get('/balance-items').then(res => res.data),
  
  create: (data) => 
    api.post('/balance-items', data).then(res => res.data),
  
  update: (id, data) => 
    api.put(`/balance-items/${id}`, data).then(res => res.data),
  
  delete: (id) => 
    api.delete(`/balance-items/${id}`).then(res => res.data),
};

// Paid-up Capital services
export const paidUpCapitalService = {
  get: () => 
    api.get('/paid-up-capital').then(res => res.data),
  
  getForDate: (date) => 
    api.get(`/paid-up-capital/for-date?date=${date}`).then(res => res.data),
  
  getHistory: () => 
    api.get('/paid-up-capital/history').then(res => res.data),
  
  update: (data) => 
    api.put('/paid-up-capital', data).then(res => res.data),
};

export default api;