import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api', // Base URL do backend Flask
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT em cada requisição
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
