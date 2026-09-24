'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserSession } from '../lib/types';
import { loginUser, logoutUser } from '../lib/api';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // On mount: attempt to restore session
  // V3: Primary = verify JWT cookie via /api/auth/me
  // Fallback: check localStorage for token (backward compat with V1/V2)
  useEffect(() => {
    async function restoreSession() {
      try {
        // Try cookie-based auth first
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser({
              id: data.user.userId,
              username: data.user.username,
              email: data.user.email || '',
              role: data.user.role,
              token: '' // Cookie-based — no token in memory
            });
            return;
          }
        }
      } catch {
        // Ignore network errors during restore
      }

      // Fallback: localStorage session (V1/V2 compat)
      try {
        const stored = localStorage.getItem('vanta_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        }
      } catch {
        // Ignore parse errors
      } finally {
        setLoading(false);
      }
      setLoading(false);
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (username: string, password: string) => {
    const data = await loginUser({ username, password });
    const session: UserSession = {
      ...data.user,
      token: data.token || ''
    };
    setUser(session);
    // Store in localStorage as V2 compat (cookie is set by the API response)
    try {
      localStorage.setItem('vanta_session', JSON.stringify(session));
    } catch {}
    router.push('/');
  };

  const logout = async () => {
    await logoutUser().catch(() => {}); // Clear httpOnly cookie server-side
    setUser(null);
    try {
      localStorage.removeItem('vanta_session');
    } catch {}
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
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
