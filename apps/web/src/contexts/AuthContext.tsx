'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
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

function getToken(): string | null {
  return localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
}

function getUser(): AuthUser | null {
  const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, senha: string, manterConectado = false) => {
    const { data } = await api.post<LoginResponse>('/v1/auth/login', { email, senha });

    const storage = manterConectado ? localStorage : sessionStorage;

    // Limpar ambos antes de gravar no correto
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');

    storage.setItem('accessToken', data.accessToken);
    storage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const updateAvatarUrl = useCallback((url: string | null) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, avatarUrl: url };
      // Update in whichever storage was used
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
