'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, tokens, type User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      // Разлогиниваем только если токен отвергнут, а не когда сервер недоступен
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) tokens.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    await api.login(identifier, password);
    setUser(await api.me());
  }, []);

  const register = useCallback(
    async (data: { email: string; username: string; password: string; full_name?: string }) => {
      await api.register(data);
      await login(data.username, data.password);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
