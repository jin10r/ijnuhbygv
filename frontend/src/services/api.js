import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/api/health');
    return response.data;
  },

  // User endpoints
  async createUser(userData) {
    const response = await api.post('/api/users', userData);
    return response.data;
  },

  async getCurrentUser(telegramId) {
    const response = await api.get(`/api/users/me?telegram_id=${telegramId}`);
    return response.data;
  },

  async updateCurrentUser(telegramId, userData) {
    const response = await api.put(`/api/users/me`, { ...userData, telegram_id: telegramId });
    return response.data;
  },

  // Properties endpoints
  async getProperties(telegramId) {
    const response = await api.get(`/api/properties?telegram_id=${telegramId}`);
    return response.data;
  },

  async getLikedProperties(telegramId) {
    const response = await api.get(`/api/liked-properties?telegram_id=${telegramId}`);
    return response.data;
  },

  // Matches endpoints
  async getMatches(telegramId) {
    const response = await api.get(`/api/matches?telegram_id=${telegramId}`);
    return response.data;
  },

  async getUserMatches(telegramId) {
    const response = await api.get(`/api/user-matches?telegram_id=${telegramId}`);
    return response.data;
  },

  // Likes endpoints
  async createLike(telegramId, targetId, targetType) {
    const response = await api.post(`/api/likes?telegram_id=${telegramId}`, null, {
      params: {
        target_id: targetId,
        target_type: targetType
      }
    });
    return response.data;
  }
};

export default api;