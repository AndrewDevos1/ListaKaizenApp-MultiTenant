import axios from 'axios';

// URL da API em produção (Railway)
const PRODUCTION_API_URL = 'https://kaizen-lists-api-production.up.railway.app/api';

const normalizeApiUrl = (url: string) => {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

// Determina a URL base da API
const getApiBaseUrl = () => {
  // Em produção (hostname do Railway), usar URL hardcoded
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return PRODUCTION_API_URL;
  }
  // REACT_APP_API_URL já inclui /api
  if (process.env.REACT_APP_API_URL) {
    return normalizeApiUrl(process.env.REACT_APP_API_URL);
  }
  // REACT_APP_API_BASE_URL precisa adicionar /api
  if (process.env.REACT_APP_API_BASE_URL) {
    return normalizeApiUrl(process.env.REACT_APP_API_BASE_URL);
  }
  // Fallback para desenvolvimento local
  return 'http://127.0.0.1:5000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT em cada requisição
api.interceptors.request.use(async (config) => {
  console.log('[INTERCEPTOR] Executando interceptor...');
  console.log('[INTERCEPTOR] Método:', config.method?.toUpperCase());
  console.log('[INTERCEPTOR] URL:', config.url);

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

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => {
    console.log('[API] Resposta bem-sucedida:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('[API] Erro na requisição:');
    console.error('[API] Status:', error.response?.status);
    console.error('[API] Dados do erro:', error.response?.data);
    console.error('[API] Mensagem:', error.message);
    console.error('[API] Config:', error.config);

    if (error.message === 'Network Error') {
      console.error('[API] ERRO DE REDE - Verifique se o backend está rodando');
    }

    if (error.response?.status === 0) {
      console.error('[API] CORS ou erro de conexão - verifique CORS no backend');
    }

    return Promise.reject(error);
  }
);

export default api;
