import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUser: (email: string) => Promise<boolean>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from refresh token cookie or default demo user
  const initAuth = useCallback(async () => {
    try {
      // 1. Try refresh endpoint first (uses HttpOnly cookie)
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data.accessToken) {
          setAccessToken(json.data.accessToken);
          setUser(json.data.user);
          setIsLoading(false);
          return;
        }
      }

      // 2. If no cookie, auto-login as Admin so the applet is immediately interactive
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@agency.com', password: 'password123' }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
      }
    } catch (err) {
      console.error('Session init error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Authenticated fetch wrapper that injects Bearer token and handles refresh
  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers || {});
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      let response = await fetch(input, { ...init, headers });

      // If token expired, try to refresh via cookie once
      if (response.status === 401) {
        try {
          const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.data.accessToken;
            setAccessToken(newToken);
            setUser(data.data.user);

            headers.set('Authorization', `Bearer ${newToken}`);
            response = await fetch(input, { ...init, headers });
          } else {
            // Refresh failed, clear session
            setAccessToken(null);
            setUser(null);
          }
        } catch {
          setAccessToken(null);
          setUser(null);
        }
      }

      return response;
    },
    [accessToken]
  );

  const login = async (email: string, password = 'password123'): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAccessToken(json.data.accessToken);
        setUser(json.data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const switchUser = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAccessToken(json.data.accessToken);
        setUser(json.data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Demo switch error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        switchUser,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
