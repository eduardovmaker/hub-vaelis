"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Estado de sessão do painel.
 *
 * A autorização real vive no cookie httpOnly assinado pelo servidor; o que
 * fica aqui serve apenas para desenhar a interface. Ao montar, confirmamos a
 * sessão em /api/auth/session para não exibir um painel com sessão vencida.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function confirmSession() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (active) setUser(res.ok && data.user ? data.user : null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    confirmSession();
    return () => {
      active = false;
    };
  }, []);

  const login: AuthContextType["login"] = async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "E-mail ou senha inválidos." };
      }

      const authenticated = data.user as SessionUser;
      setUser(authenticated);

      if (authenticated.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (authenticated.tenantId) {
        router.push(`/tenant/${authenticated.tenantId}`);
      } else {
        router.push("/login");
      }

      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor." };
    }
  };

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
};
