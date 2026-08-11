"use client";

import React, { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, AlertCircle, Store, Zap } from "lucide-react";

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
      setError(result.error || "Credenciais de acesso incorretas.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-200" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header com Logo Vaelis-HUB e Theme Toggle */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Zap className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Vaelis<span style={{ color: "var(--brand-primary)" }}>-HUB</span>
            </h1>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Plataforma Omnichannel de Engajamento, Mídia Indoor & Captive Portal
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Store className="w-3.5 h-3.5" /> Portal Administrativo
              </span>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Acesse sua Conta
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Gestão integrada de Mídia Indoor TV, Rádio Comercial, Automação de Avaliações Google e Captive Portal Wi-Fi
              </p>
            </div>

            {/* Banner de Cadastro Auto-Serviço */}
            <div className="mb-6 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                🚀 Ainda não possui uma conta?
              </span>
              <a href="/checkout" className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">
                Criar Conta & Ativar Estabelecimento <ArrowRight className="w-3.5 h-3.5" />
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
                    placeholder="seu.email@empresa.com"
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
                    Entrar no Vaelis-HUB <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
        Vaelis-HUB © {new Date().getFullYear()} — Plataforma Omnichannel de Engajamento & Mídia para Estabelecimentos
      </footer>
    </div>
  );
}
