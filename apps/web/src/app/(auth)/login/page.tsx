"use client";

import React, { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { MOCK_USERS } from "@/mocks/auth";
import { Wifi, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Building2, Store } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Credenciais inválidas.");
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-200" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header com Logo e Theme Toggle */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <Store className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Hub<span style={{ color: "var(--brand-primary)" }}>Local</span>
            </h1>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Plataforma de Engajamento & Soluções para Estabelecimentos
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* Conteúdo Principal / Card de Login */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Card Principal */}
          <div 
            className="rounded-2xl border p-6 sm:p-8 shadow-xl transition-colors duration-200"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="space-y-2 text-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Store className="w-3.5 h-3.5" /> Portal do Estabelecimento
              </span>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Acessar seu Estabelecimento
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Gerencie Mídia TV, Rádio, Avaliações Google, WhatsApp e Módulo Wi-Fi
              </p>
            </div>

            {/* Banner de Cadastro Auto-Serviço */}
            <div className="mb-6 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                🚀 Não tem uma conta? Assine a plataforma em 1 minuto:
              </span>
              <a href="/checkout" className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">
                Criar Minha Conta & Ativar Tenant <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: "var(--text-secondary)" }}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@dominio.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Senha de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: "var(--text-secondary)" }}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar no Painel <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Painel de Credenciais do Administrador */}
          <div 
            className="rounded-2xl border p-5 transition-colors duration-200"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Acesso Master Admin
              </h3>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              Clique abaixo para preencher o login do Administrador do sistema:
            </p>

            <button
              type="button"
              onClick={() => handleQuickSelect("admin@captivehub.com", "admin123")}
              className="w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all text-xs hover:border-blue-500/50"
              style={{
                borderColor: "var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-xs leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                    Master Admin CaptiveHub
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    admin@captivehub.com
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 bg-blue-600/10 text-blue-600 dark:text-blue-400">
                Master Admin
              </span>
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
        HubLocal © {new Date().getFullYear()} — Plataforma de Engajamento & Crescimento para Comércios e Estabelecimentos
      </footer>
    </div>
  );
}
