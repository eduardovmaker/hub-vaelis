"use client";

import React, { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, AlertCircle, Zap, HelpCircle } from "lucide-react";

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
    <div className="min-h-screen relative flex flex-col justify-between bg-[#F9FAFB] dark:bg-[#161C24] transition-colors duration-200 overflow-hidden font-sans">
      {/* Background Soft Aura Gradient (Inspiração Minimal UI) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/50 via-indigo-50/30 to-transparent dark:from-blue-900/10 dark:via-transparent pointer-events-none rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-100/40 via-purple-50/20 to-transparent dark:from-purple-950/10 dark:via-transparent pointer-events-none rounded-full blur-3xl -z-10 transform -translate-x-1/3 translate-y-1/3" />

      {/* Header Minimalist */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#2065D1] flex items-center justify-center text-white shadow-md shadow-blue-600/20">
            <Zap className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#212B36] dark:text-white">
            Vaelis<span className="text-[#2065D1]">.HUB</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="mailto:suporte@vaelis.com.br"
            className="text-xs font-semibold text-[#637381] hover:text-[#212B36] dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-[#637381]" />
            Precisa de ajuda?
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Central — Card de Login Minimal UI */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-[420px] bg-white dark:bg-[#212B36] shadow-minimal rounded-2xl p-8 sm:p-10 space-y-6 transition-all border-0">
          {/* Cabeçalho do Form */}
          <div className="space-y-1.5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#212B36] dark:text-white">
              Acesse sua conta
            </h2>
            <p className="text-xs font-medium text-[#637381] dark:text-gray-400">
              Plataforma Omnichannel & Mídia Indoor
            </p>
          </div>

          {/* Banner Erro */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form de Autenticação */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#212B36] dark:text-gray-300">
                Endereço de e-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@empresa.com"
                  className="w-full px-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-zinc-800 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#212B36] dark:text-gray-300">
                  Senha
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Por favor, contate o administrador da sua empresa para redefinir sua senha.");
                  }}
                  className="text-xs font-semibold text-[#2065D1] hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#919EAB]/[0.08] dark:bg-zinc-800/70 border border-transparent rounded-xl text-sm text-[#212B36] dark:text-white placeholder-[#919EAB] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-zinc-800 transition-all"
                />
              </div>
            </div>

            {/* Botão Primário Dark Largo */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#212B36] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#212B36] font-bold rounded-xl text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no sistema
                </>
              )}
            </button>
          </form>

          {/* Divisor Visual */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#919EAB]/20" />
            </div>
            <span className="relative px-3 bg-white dark:bg-[#212B36] text-[11px] font-semibold text-[#919EAB] uppercase tracking-wider">
              Acesso Restrito
            </span>
          </div>

          <p className="text-center text-[11px] text-[#637381] dark:text-gray-400">
            Cadastros são gerenciados exclusivamente pela administração da rede.
          </p>
        </div>
      </main>

      {/* Footer Minimal */}
      <footer className="py-6 text-center text-xs font-medium text-[#637381] dark:text-gray-500 z-10">
        Vaelis-HUB © {new Date().getFullYear()} — Todos os direitos reservados.
      </footer>
    </div>
  );
}
