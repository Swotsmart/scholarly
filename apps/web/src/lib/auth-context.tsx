'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  roles: string[];
  jurisdiction: string;
  trustScore: number;
  tokenBalance: number;
}

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('scholarly_token');
    const storedTenantId = localStorage.getItem('scholarly_tenant_id');

    if (storedToken && storedTenantId) {
      setToken(storedToken);
      setTenantId(storedTenantId);
      // Fetch user data
      fetchUser(storedToken, storedTenantId);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchUser(authToken: string, tenant: string) {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          'x-demo-user-id': authToken,
          'x-demo-tenant-id': tenant,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Invalid token, clear storage
        localStorage.removeItem('scholarly_token');
        localStorage.removeItem('scholarly_tenant_id');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error('Login failed');
      }

      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      setTenantId(data.tenant.id);

      localStorage.setItem('scholarly_token', data.token);
      localStorage.setItem('scholarly_tenant_id', data.tenant.id);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    setTenantId(null);
    localStorage.removeItem('scholarly_token');
    localStorage.removeItem('scholarly_tenant_id');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantId,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
