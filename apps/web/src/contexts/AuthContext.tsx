'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import api, { invalidateTokenCache } from '@/lib/api';
import { AuthUser, LoginResponse } from 'shared';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, senha: string, manterConectado?: boolean) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  updateAvatarUrl: (url: string | null) => void;
  refreshUser: () => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial estável entre server/client para evitar hydration mismatch.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = readStoredToken();
    const storedUser = readStoredUser();
    if (!token || !storedUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(storedUser);
    void api.get<AuthUser>('/v1/auth/profile')
      .then(({ data }) => {
        const refreshed = { ...storedUser, ...data };
        const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(refreshed));
        setUser(refreshed);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
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

    invalidateTokenCache();
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    invalidateTokenCache();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

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

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<any>('/v1/auth/profile');
      if (!data) return;
      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          nome: data.nome ?? prev.nome,
          email: data.email ?? prev.email,
          role: data.role ?? prev.role,
          restauranteId: data.restaurante?.id ?? prev.restauranteId,
          avatarUrl: data.avatarUrl ?? prev.avatarUrl,
          modulos: data.modulos ?? prev.modulos,
          sessionTimeoutMinutos: data.sessionTimeoutMinutos ?? prev.sessionTimeoutMinutos,
        };
        if (localStorage.getItem('user')) {
          localStorage.setItem('user', JSON.stringify(updated));
        } else if (sessionStorage.getItem('user')) {
          sessionStorage.setItem('user', JSON.stringify(updated));
        }
        return updated;
      });
    } catch {
      // silencioso se falhar
    }
  }, []);

  // Expira por inatividade usando o timeout do servidor; atividade renova.
  const timeoutMin = user?.sessionTimeoutMinutos;
  const uid = user?.id;
  useEffect(() => {
    if (!uid || !timeoutMin) return;
    const KEY = 'lastActivity';
    const ms = timeoutMin * 60_000;
    const last = Number(localStorage.getItem(KEY));
    if (last && Date.now() - last > ms) { logout(); return; }
    let timer: ReturnType<typeof setTimeout>;
    let lastWrite = 0;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const l = Number(localStorage.getItem(KEY)) || 0;
        if (Date.now() - l >= ms) logout(); else arm();
      }, ms);
    };
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < 1000) return; // throttle
      lastWrite = now;
      localStorage.setItem(KEY, String(now));
      arm();
    };
    touch();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, touch)); };
  }, [uid, timeoutMin, logout]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSuperAdmin, updateAvatarUrl, refreshUser }}>
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
