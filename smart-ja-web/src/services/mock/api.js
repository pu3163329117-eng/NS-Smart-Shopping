import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const MockAPI = {
  // Services
  getServices: async () => {
    try {
      const response = await api.get('/services');
      return response.data;
    } catch (error) {
      console.error("API Error", error);
      // Fallback to empty array if backend is down
      return [];
    }
  },

  getMyServices: async () => {
    try {
      const response = await api.get('/services/my');
      return response.data;
    } catch (error) {
      console.error("API Error", error);
      return [];
    }
  },

  getServiceById: async (id) => {
    // Implement get by id backend route later, for now filter client side
    const response = await api.get('/services');
    return response.data.find(s => s.id === id);
  },

  createService: async (serviceData) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },

  // Auth
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data.user;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Orders
  getOrders: async (type = 'buyer') => {
    try {
      const endpoint = type === 'maker' ? '/orders/maker' : '/orders/my';
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error("Order API Error", error);
      return [];
    }
  },
  
  createOrder: async (orderData) => {
    // orderData: { serviceId, amount, notes }
    try {
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error("Create Order Error", error);
      throw error;
    }
  }
};
