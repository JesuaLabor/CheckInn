import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
  }
  return '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('localstay_token') || localStorage.getItem('checkinn_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If data is FormData, remove Content-Type so browser sets multipart/form-data with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't wipe if we're on login page or intentionally testing
    }
    return Promise.reject(error);
  }
);
