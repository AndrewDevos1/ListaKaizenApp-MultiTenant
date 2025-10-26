import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT em cada requisição
api.interceptors.request.use(async (config) => {
  console.log('[INTERCEPTOR] Executando interceptor...');
  const token = localStorage.getItem('accessToken');
  console.log('[INTERCEPTOR] Token no localStorage:', token ? `${token.substring(0, 30)}...` : 'NULL');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[INTERCEPTOR] Token anexado ao header');
  } else {
    console.warn('[INTERCEPTOR] NENHUM TOKEN ENCONTRADO!');
  }

  console.log('[INTERCEPTOR] Headers da requisicao:', config.headers);
  return config;
}, (error) => {
  console.error('[INTERCEPTOR] Erro no interceptor:', error);
  return Promise.reject(error);
});

export default api;
