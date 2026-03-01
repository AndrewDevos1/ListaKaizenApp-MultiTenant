import axios from 'axios';

// Token cacheado em memória — evita ler localStorage em cada request
let _cachedToken: string | null | undefined = undefined;

export function invalidateTokenCache() {
  _cachedToken = undefined;
}

function readToken(): string | null {
  if (_cachedToken !== undefined) return _cachedToken;
  _cachedToken =
    localStorage.getItem('accessToken') ??
    sessionStorage.getItem('accessToken') ??
    null;
  return _cachedToken;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 15000, // 15s máximo — evita requests pendurados
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = readToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      invalidateTokenCache();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
