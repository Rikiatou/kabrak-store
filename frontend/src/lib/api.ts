import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kabrak_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop when already on login/register/forgot/reset pages
      const path = window.location.pathname.toLowerCase();
      const isAuthPage = path.includes('/login') || path.includes('/register') || path.includes('/forgot') || path.includes('/reset');
      if (!isAuthPage) {
        localStorage.removeItem('kabrak_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
