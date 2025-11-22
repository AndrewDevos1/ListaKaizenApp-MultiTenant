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

/**
 * Pinga o backend para acordar o serviço Render (plano free dorme após inatividade).
 * Faz requisição silenciosa ao health check endpoint.
 * Ignora erros para não bloquear a interface.
 */
export const pingBackend = async (): Promise<void> => {
  try {
    console.log('[PING] Acordando backend Render...');
    await api.get('/v1/health', { timeout: 10000 });
    console.log('[PING] Backend acordado com sucesso!');
  } catch (error) {
    // Ignora erro silenciosamente (backend pode estar dormindo)
    const message = error instanceof Error ? error.message : 'sleeping';
    console.log('[PING] Backend ping:', message);
  }
};

export default api;
