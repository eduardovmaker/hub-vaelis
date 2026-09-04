"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Pede o e-mail e dispara o link de redefinição. */
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    setDevResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Não foi possível enviar o e-mail. Tente de novo.");
        return;
      }

      setMessage(data.message);
      // Só chega preenchido em desenvolvimento, sem provedor de e-mail.
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="minimal-card w-full max-w-md p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
          <Mail className="h-6 w-6" />
        </span>

        <h1 className="mt-5 text-xl font-extrabold">Esqueceu a senha?</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold">
              Endereço de e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              className="minimal-input w-full px-4 py-3"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3.5 text-xs font-medium text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {devResetUrl && (
            <a
              href={devResetUrl}
              className="block break-all rounded-xl bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-700 underline"
            >
              {devResetUrl}
            </a>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#212B36] px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-black disabled:opacity-60 dark:bg-white dark:text-[#212B36]"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
