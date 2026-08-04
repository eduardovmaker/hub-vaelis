"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MockUser, validateCredentials } from '@/mocks/auth';

interface AuthContextType {
  user: MockUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setSessionUser: (user: MockUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Carregar sessão salva do localStorage se existir
    const storedUser = localStorage.getItem('captive_hub_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Erro ao ler usuário salvo:', err);
        localStorage.removeItem('captive_hub_user');
      }
    }
    setIsLoading(false);
  }, []);

  const setSessionUser = (sessionUser: MockUser) => {
    setUser(sessionUser);
    localStorage.setItem('captive_hub_user', JSON.stringify(sessionUser));
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'E-mail ou senha inválidos.' };
      }

      const authenticatedUser: MockUser = data.user;
      setUser(authenticatedUser);
      localStorage.setItem('captive_hub_user', JSON.stringify(authenticatedUser));

      // Redirecionamento baseado na Role do Usuário
      if (authenticatedUser.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (authenticatedUser.role === 'TENANT_ADMIN' && authenticatedUser.tenantId) {
        router.push(`/tenant/${authenticatedUser.tenantId}`);
      } else {
        router.push('/');
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Erro de conexão com o servidor de banco de dados.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('captive_hub_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setSessionUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
