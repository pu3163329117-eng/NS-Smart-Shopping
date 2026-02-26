// Service Layer Pattern for Clean Architecture
// This file acts as the single source of truth for all API calls.
// It allows us to switch between Mock Data and Real Backend easily.

import axios from 'axios';

// Environment variable for API URL (set in .env file)
const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 60000 // Increased timeout to 60s for AI
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Add locale to header for backend i18n support
    const locale = localStorage.getItem('locale') || 'zh';
    config.headers['X-Locale'] = locale;
    return config;
  },
  error => Promise.reject(error)
);

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    // Handle 401 Unauthorized (Token expired)
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // Clear local storage and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
           window.location.href = '/login';
        }
        return Promise.reject(new Error('您的登录已过期，请重新登录'));
      }
      
      if (status === 403) {
        return Promise.reject(new Error('您没有权限执行此操作'));
      }
      
      if (status >= 500) {
        return Promise.reject(new Error('服务器出小差了，请稍后再试'));
      }

      // Return custom message from backend if available
      if (data && data.message) {
        // Keep the original error properties (like response) but update the message
        error.message = data.message;
        return Promise.reject(error);
      }
    } else if (error.request) {
      // Network Error
      return Promise.reject(new Error('网络连接失败，请检查您的网络'));
    }
    
    return Promise.reject(error);
  }
);

// Define api alias for consistency with previous code usage
const api = apiClient;

// --- API Modules ---

export const AuthService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me')
};

export const MakerService = {
  getDashboardStats: () => api.get('/maker/stats'),
  async getServices() {
    return api.get('/maker/services');
  },
  async createService(serviceData) {
    return api.post('/maker/services', serviceData);
  },
  updateService: (id, data) => api.put(`/maker/services/${id}`, data),
  deleteService: (id) => api.delete(`/maker/services/${id}`),
  getOrders: (status) => api.get('/maker/orders', { params: { status } }),
  completeOrder: (id) => api.post(`/maker/orders/${id}/complete`)
};

export const MarketService = {
  getAllServices: (params) => api.get('/market/services', { params }),
  getFeaturedServices: () => api.get('/market/featured'),
  getServiceById: (id) => api.get(`/market/services/${id}`),
  createOrder: (data) => api.post('/market/orders', data)
};

export const UserService = {
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData);
  },

  async getAddresses() {
    return api.get('/user/addresses');
  },

  async addAddress(address) {
    return api.post('/user/addresses', address);
  },

  async getMyOrders() {
    return api.get('/user/orders');
  },
  async getProfile() {
    return api.get('/user/profile');
  },
  async createOrder(orderData) {
    return api.post('/orders', orderData);
  },
  
  async updateOrderStatus(id, status) {
    return api.put(`/orders/${id}/status`, { status });
  },

  async updateProfile(data) {
    return api.put('/user/profile', data);
  },
  
  async dailyCheckin() {
    return api.post('/user/checkin');
  },

  async topUpWallet(amount) {
    return api.post('/user/wallet/topup', { amount });
  }
};

export default api;
