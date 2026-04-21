// Service Layer Pattern for Clean Architecture
// This file acts as the single source of truth for all API calls.
// It uses real backend APIs only.

import axios from 'axios';

// Environment variable for API URL (set in .env file)
const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: Number.isFinite(API_TIMEOUT_MS) && API_TIMEOUT_MS > 0 ? API_TIMEOUT_MS : 60000
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      config.headers['X-Request-Id'] = crypto.randomUUID();
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
        return Promise.reject(new Error('Login expired. Please sign in again.'));
      }

      if (status === 403) {
        return Promise.reject(new Error('Access denied.'));
      }

      if (status >= 500) {
        return Promise.reject(new Error('Server error. Please try again later.'));
      }

      // Return custom message from backend if available
      if (data && data.message) {
        // Keep the original error properties (like response) but update the message
        error.message = data.message;
        return Promise.reject(error);
      }
    } else if (error.request) {
      // Network Error
      return Promise.reject(new Error('Network connection failed. Please check your internet and retry.'));
    }

    return Promise.reject(error);
  }
);

// Define api alias for consistency with previous code usage
const api = apiClient;

// --- API Modules ---

export const AuthService = {
  login: (credentials) => api.post('/auth/login', credentials),
  sendCode: (payload) => api.post('/auth/send-code', payload),
  loginWithCode: (payload) => api.post('/auth/login-with-code', payload),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getInvestorStats: () => api.get('/admin/investor/stats')
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
  completeOrder: (id) => api.post(`/maker/orders/${id}/complete`),
  updateOrderStatus: (id, status, extra = {}) => api.patch(`/maker/orders/${id}/status`, { status, ...extra }),
  fulfillOrder: (id, payload = {}) => api.patch(`/maker/orders/${id}/ship`, payload)
};

export const MarketService = {
  getAllServices: (params) => api.get('/market/services', { params }),
  getFeaturedServices: () => api.get('/market/featured'),
  getServiceById: (id) => api.get(`/market/services/${id}`),
  createOrder: (data) => api.post('/market/orders', data),
  publishAIProject: (serviceData) => api.post('/ai/publish', { serviceData })
};

export const CrowdfundingService = {
  getProjects: () => api.get('/crowdfunding'),
  getProjectOverview: (projectId, params = {}) => api.get(`/crowdfunding/${projectId}/overview`, { params }),
  getProjectSupporters: (projectId, params = {}) => api.get(`/crowdfunding/${projectId}/supporters`, { params }),
  getProjectMilestones: (projectId) => api.get(`/crowdfunding/${projectId}/milestones`),
  getProjectUpdates: (projectId) => api.get(`/crowdfunding/${projectId}/updates`),
  getMyApplications: () => api.get('/crowdfunding/my/applications'),
  getAdminApplications: (params = {}) => api.get('/crowdfunding/admin/applications', { params }),
  approveApplication: (id) => api.post(`/crowdfunding/admin/${id}/approve`),
  rejectApplication: (id, payload = {}) => api.post(`/crowdfunding/admin/${id}/reject`, payload),
  addMilestone: (projectId, payload = {}) => api.post(`/crowdfunding/${projectId}/milestones`, payload),
  updateMilestone: (projectId, milestoneId, payload = {}) =>
    api.patch(`/crowdfunding/${projectId}/milestones/${milestoneId}`, payload),
  addProjectUpdate: (projectId, payload = {}) => api.post(`/crowdfunding/${projectId}/updates`, payload),
  updateProjectStage: (projectId, payload = {}) => api.patch(`/crowdfunding/${projectId}/stage`, payload),
  apply: (payload = {}) => api.post('/crowdfunding/apply', payload),
  supportProject: (projectId, payload = {}) => api.post(`/crowdfunding/${projectId}/support`, payload)
};

export const ReviewService = {
  async getProductReviews(productId, params = {}) {
    return api.get(`/market/services/${productId}/reviews`, { params });
  },

  async createProductReview(productId, data) {
    return api.post(`/market/services/${productId}/reviews`, data);
  }
};

export const SocialService = {
  async getPosts(params = {}) {
    return api.get('/social/posts', { params });
  },

  async createPost(data) {
    return api.post('/social/posts', data);
  },

  async likePost(postId) {
    return api.post(`/social/posts/${postId}/like`);
  },

  async deletePost(postId) {
    return api.delete(`/social/posts/${postId}`);
  }
};

export const UserService = {
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  async getAddresses() {
    return api.get('/user/addresses');
  },

  async addAddress(address) {
    const payload = {
      receiver: address?.receiver || address?.name || '',
      phone: address?.phone || '',
      region: address?.region || '',
      detail: address?.detail || '',
      isDefault: Boolean(address?.isDefault)
    };

    return api.post('/user/addresses', payload);
  },

  async updateAddress(id, address) {
    const payload = {
      receiver: address?.receiver || address?.name || '',
      phone: address?.phone || '',
      region: address?.region || '',
      detail: address?.detail || '',
      isDefault: Boolean(address?.isDefault)
    };

    return api.patch(`/user/addresses/${id}`, payload);
  },

  async deleteAddress(id) {
    return api.delete(`/user/addresses/${id}`);
  },

  async setDefaultAddress(id) {
    return api.patch(`/user/addresses/${id}/default`);
  },

  async getMyOrders() {
    return api.get('/user/orders');
  },
  async getProfile() {
    return api.get('/user/profile');
  },
  async createOrder(orderData) {
    const result = await api.post('/orders', orderData);
    const data = result?.data || result || {};
    
    // Compatibility Layer: Handle single order vs split orders
    const isSplit = data.split === true || Array.isArray(data.orders);
    const orders = Array.isArray(data.orders) ? data.orders : (data.id || data.orderId ? [data] : []);
    const count = data.count || orders.length;

    return {
      success: true,
      split: isSplit,
      count: count,
      orders: orders,
      raw: data
    };
  },

  async updateOrderStatus(id, status) {
    return api.put(`/orders/${id}/status`, { status });
  },

  async confirmOrderReceipt(id) {
    return api.post(`/orders/${id}/confirm`);
  },

  async cancelOrder(id) {
    return api.post(`/orders/${id}/cancel`);
  },

  async refundOrder(id, payload = {}) {
    return api.post(`/orders/${id}/refund`, payload);
  },

  async getOrderDetail(id) {
    return api.get(`/orders/${id}`);
  },

  async updateProfile(data) {
    return api.put('/user/profile', data);
  },

  async dailyCheckin() {
    return api.post('/user/checkin');
  },

  async topUpWallet(amount) {
    return api.post('/user/wallet/topup', { amount });
  },

  async getWalletTransactions(params = {}) {
    return api.get('/user/wallet/transactions', { params });
  },

  async getWalletSummary() {
    return api.get('/user/wallet/summary');
  },

  async getAiQuota() {
    return api.get('/ai/quota');
  }
};

export const GushiService = {
  getHome: () => api.get('/gushi/home'),
  getProducts: (params) => api.get('/gushi/products', { params }),
  getProductById: (id) => api.get(`/gushi/products/${id}`),
  getTrades: (id, params) => api.get(`/gushi/products/${id}/trades`, { params }),
  getListings: (id, params) => api.get(`/gushi/products/${id}/listings`, { params }),
  getOffers: (id, params) => api.get(`/gushi/products/${id}/offers`, { params }),
  createListing: (data) => api.post('/gushi/listings', data),
  updateListing: (id, data) => api.patch(`/gushi/listings/${id}`, data),
  offlineListing: (id) => api.post(`/gushi/listings/${id}/offline`),
  createOffer: (payload) => api.post('/gushi/offers', payload),
  fulfillOffer: (id) => api.post(`/gushi/offers/${id}/fulfill`),
  cancelOffer: (id) => api.post(`/gushi/offers/${id}/cancel`),
  createOrder: (data) => api.post('/gushi/orders', data),
  getOrderDetail: (id) => api.get(`/gushi/orders/${id}`),
  shipOrder: (id, data) => api.post(`/gushi/orders/${id}/ship`, data),
  confirmOrder: (id) => api.post(`/gushi/orders/${id}/confirm`),
  cancelOrder: (id) => api.post(`/gushi/orders/${id}/cancel`),
  addFavorite: (productId) => api.post(`/gushi/favorites/${productId}`),
  removeFavorite: (productId) => api.delete(`/gushi/favorites/${productId}`),
  getMyListings: (params) => api.get('/gushi/me/listings', { params }),
  getMyOrders: (params) => api.get('/gushi/me/orders', { params }),
  getMyFavorites: (params) => api.get('/gushi/me/favorites', { params }),
  getMyOffers: (params) => api.get('/gushi/me/offers', { params }),
  getMyTransactions: (params) => api.get('/gushi/me/transactions', { params }),
  createDispute: (id, payload) => api.post(`/gushi/orders/${id}/dispute`, payload),
  getPendingListingsForAudit: (params) => api.get('/gushi/admin/listings/pending', { params }),
  approveListing: (id) => api.post(`/gushi/admin/listings/${id}/approve`),
  rejectListing: (id, payload = {}) => api.post(`/gushi/admin/listings/${id}/reject`, payload),
  getDisputesForAudit: (params) => api.get('/gushi/admin/orders/disputes', { params }),
  resolveDispute: (orderId, payload) => api.post(`/gushi/admin/orders/${orderId}/resolve`, payload),
  createProductRequest: (payload) => api.post('/gushi/requests/products', payload),
  getProductRequestsForAudit: (params) => api.get('/gushi/admin/requests/products', { params }),
  approveProductRequest: (id, payload = {}) => api.post(`/gushi/admin/requests/products/${id}/approve`, payload),
  rejectProductRequest: (id, payload = {}) => api.post(`/gushi/admin/requests/products/${id}/reject`, payload)
};

export const NotificationsService = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all')
};

export const AdminService = {
  getStats: () => api.get('/admin/stats'),
};

export default api;
