import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api', // Base URL do backend Flask
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT em cada requisição
api.interceptors.request.use(async (config) => {
  console.log('🔑 [INTERCEPTOR] Executando interceptor...');
  const token = localStorage.getItem('accessToken');
  console.log('🔑 [INTERCEPTOR] Token no localStorage:', token ? `${token.substring(0, 30)}...` : 'NULL');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ [INTERCEPTOR] Token anexado ao header');
  } else {
    console.warn('⚠️ [INTERCEPTOR] NENHUM TOKEN ENCONTRADO!');
  }

  console.log('🔑 [INTERCEPTOR] Headers da requisição:', config.headers);
  return config;
}, (error) => {
  console.error('❌ [INTERCEPTOR] Erro no interceptor:', error);
  return Promise.reject(error);
});

export default api;
