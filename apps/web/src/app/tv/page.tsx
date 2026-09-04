"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay, AlertCircle, Loader2 } from "lucide-react";
import { readDeviceCredential, saveDeviceCredential } from "@/lib/deviceStore";

/**
 * Tela de pareamento do player.
 *
 * É o endereço que fica salvo como página inicial no dispositivo da TV. Depois
 * do primeiro pareamento, reabrir aqui já joga direto no player.
 */
export default function PairScreenPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const credential = readDeviceCredential();
    if (credential) {
      router.replace(`/tv/${credential.screenId}`);
      return;
    }
    setIsChecking(false);
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/screen/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Não foi possível parear esta tela.");
        setIsSubmitting(false);
        return;
      }

      saveDeviceCredential({ screenId: data.screenId, deviceSecret: data.deviceSecret });
      router.replace(`/tv/${data.screenId}`);
    } catch {
      setError("Sem conexão com o servidor. Verifique a internet da TV.");
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 p-10 shadow-2xl">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <MonitorPlay className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Vaelis Indoor</h1>
            <p className="text-sm text-slate-400">Vincular esta TV ao painel do estabelecimento</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pairing-code" className="mb-2 block text-sm font-semibold text-slate-300">
              Código de pareamento
            </label>
            <input
              id="pairing-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={8}
              autoFocus
              inputMode="text"
              autoComplete="off"
              placeholder="ABC123"
              className="w-full rounded-2xl bg-slate-800 px-6 py-5 text-center text-4xl font-black tracking-[0.4em] text-white outline-none ring-blue-500 focus:ring-2"
            />
            <p className="mt-3 text-center text-xs text-slate-500">
              O código aparece no painel, na aba Telas.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || code.length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {isSubmitting ? "Vinculando..." : "Vincular tela"}
          </button>
        </form>
      </div>
    </main>
  );
}
