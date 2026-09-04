"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const MIN_PASSWORD_LENGTH = 8;

/** Cria a nova senha a partir do token recebido por e-mail. */
function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isChecking, setIsChecking] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Confere o link antes de a pessoa digitar qualquer coisa.
  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;

        if (!res.ok || !data.success) setTokenError(data.error || "Link inválido.");
        else setEmail(data.email || "");
      } catch {
        if (active) setTokenError("Erro de conexão com o servidor.");
      } finally {
        if (active) setIsChecking(false);
      }
    }

    check();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("As duas senhas não são iguais.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Não foi possível redefinir a senha.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <div className="minimal-card flex w-full max-w-md items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="minimal-card w-full max-w-md p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold">Link não utilizável</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{tokenError}</p>
        <Link
          href="/esqueci-senha"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#212B36] px-4 py-3.5 text-sm font-bold text-white dark:bg-white dark:text-[#212B36]"
        >
          Pedir um novo link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="minimal-card w-full max-w-md p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold">Senha alterada</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Já pode entrar com a nova senha. Levando você para o login...
        </p>
        <Link
          href="/login"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#212B36] px-4 py-3.5 text-sm font-bold text-white dark:bg-white dark:text-[#212B36]"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="minimal-card w-full max-w-md p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
        <KeyRound className="h-6 w-6" />
      </span>

      <h1 className="mt-5 text-xl font-extrabold">Criar nova senha</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Definindo a senha de acesso de <strong className="text-[var(--text-primary)]">{email}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="senha" className="block text-xs font-semibold">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            required
            autoFocus
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="minimal-input w-full px-4 py-3"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            No mínimo {MIN_PASSWORD_LENGTH} caracteres.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmacao" className="block text-xs font-semibold">
            Repita a nova senha
          </label>
          <input
            id="confirmacao"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="••••••••"
            className="minimal-input w-full px-4 py-3"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3.5 text-xs font-medium text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || password.length < MIN_PASSWORD_LENGTH}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#212B36] px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-black disabled:opacity-60 dark:bg-white dark:text-[#212B36]"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      {/* useSearchParams exige limite de Suspense no App Router. */}
      <Suspense
        fallback={
          <div className="minimal-card flex w-full max-w-md items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
          </div>
        }
      >
        <RedefinirSenhaForm />
      </Suspense>
    </div>
  );
}
