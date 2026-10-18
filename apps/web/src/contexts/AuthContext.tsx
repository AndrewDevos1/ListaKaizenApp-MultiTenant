'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import api, { clearStoredSession, invalidateTokenCache } from '@/lib/api';
import { AuthUser, LoginResponse } from 'shared';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, senha: string, manterConectado?: boolean) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  updateAvatarUrl: (url: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw =
    localStorage.getItem('user') ?? sessionStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('accessToken') ??
    sessionStorage.getItem('accessToken') ??
    null
  );
}

function getSessionExpiryKey(storage: Storage): string {
  return storage === localStorage ? 'sessionExpiry' : 'sessionExpirySession';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial estável entre server/client para evitar hydration mismatch.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = readStoredToken();
    const storedUser = readStoredUser();
    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
    const expiry = Number.parseInt(storage.getItem(getSessionExpiryKey(storage)) ?? '0', 10);
    if (token && storedUser && expiry > Date.now()) {
      setUser(storedUser);
    } else if (token || storedUser || expiry) {
      clearStoredSession();
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, senha: string, manterConectado = false) => {
    const { data } = await api.post<LoginResponse>('/v1/auth/login', { email, senha });

    const storage = manterConectado ? localStorage : sessionStorage;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');

    storage.setItem('accessToken', data.accessToken);
    storage.setItem('user', JSON.stringify(data.user));
    try {
      const encodedPayload = data.accessToken.split('.')[1];
      const tokenPayload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
      const tokenExpiry = Number(tokenPayload.exp) * 1000;
      if (!Number.isFinite(tokenExpiry) || tokenExpiry <= Date.now()) throw new Error('expired');
      storage.setItem(getSessionExpiryKey(storage), String(tokenExpiry));
    } catch {
      clearStoredSession();
      throw new Error('Token JWT inválido');
    }

    invalidateTokenCache();
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    invalidateTokenCache();
    clearStoredSession();
    setUser(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    if (!user) return;
    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
    const key = getSessionExpiryKey(storage);
    const expiry = Number.parseInt(storage.getItem(key) ?? '0', 10);
    const timer = window.setTimeout(() => logout(), Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [user, logout]);

  const updateAvatarUrl = useCallback((url: string | null) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, avatarUrl: url };
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(updated));
      } else if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSuperAdmin, updateAvatarUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
