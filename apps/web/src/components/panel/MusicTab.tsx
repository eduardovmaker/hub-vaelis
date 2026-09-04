"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Link2, Loader2, Music2, Shuffle, Unlink } from "lucide-react";

interface SpotifyPlaylistOption {
  uri: string;
  name: string;
  imageUrl: string;
  trackCount: number;
  owner: string;
}

interface SpotifyStatus {
  connected: boolean;
  displayName?: string;
  product?: string;
  needsPremium: boolean;
  contextUri?: string;
  playlistName?: string;
  shuffle?: boolean;
  playlists: SpotifyPlaylistOption[];
  tokenError?: string | null;
}

/** Conexão da conta Spotify e escolha da trilha que toca nas telas. */
export function MusicTab({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<SpotifyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "erro"; message: string } | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch(`/api/tenant/${tenantId}/spotify`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data.success) setStatus(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();

    // O callback do OAuth volta com o resultado na querystring.
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify") === "conectado") {
      setFeedback({
        type: "ok",
        message:
          params.get("aviso") === "sem_premium"
            ? "Conta conectada, mas não é Premium. Sem Premium a tela não toca faixas completas."
            : "Conta Spotify conectada.",
      });
    } else if (params.get("error")) {
      setFeedback({ type: "erro", message: `Falha ao conectar o Spotify (${params.get("error")}).` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function post(body: Record<string, unknown>) {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/spotify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setFeedback(
        data.success
          ? { type: "ok", message: data.message || "Configuração salva." }
          : { type: "erro", message: data.error || "Não foi possível salvar." }
      );
      if (data.success) await loadStatus();
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <section className="minimal-card p-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Music2 className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold">Conectar o Spotify</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          A tela se registra como um dispositivo Spotify e toca a playlist escolhida aqui. É
          necessária uma conta <strong>Premium</strong> do estabelecimento: sem ela o Spotify não
          autoriza reprodução em dispositivos web.
        </p>

        <a
          href={`/api/auth/spotify/login?tenantId=${encodeURIComponent(tenantId)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <Link2 className="h-4 w-4" />
          Conectar conta Spotify
        </a>

        {feedback && (
          <p
            className={`mt-4 text-sm font-semibold ${
              feedback.type === "ok" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="minimal-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{status.displayName}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Conta conectada · plano {status.product || "desconhecido"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => post({ action: "set-shuffle", shuffle: !status.shuffle })}
              disabled={isSaving}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
                status.shuffle
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-black/5 text-[var(--text-secondary)]"
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              {status.shuffle ? "Aleatório ligado" : "Aleatório desligado"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Desconectar a conta Spotify? As telas ficam sem música.")) {
                  post({ action: "disconnect" });
                }
              }}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-black/5 px-4 py-2 text-xs font-bold text-red-500"
            >
              <Unlink className="h-3.5 w-3.5" />
              Desconectar
            </button>
          </div>
        </div>

        {status.needsPremium && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Esta conta não é Premium. O Spotify recusa reprodução em dispositivos web sem Premium, e
            a tela ficará sem música.
          </p>
        )}

        {status.tokenError && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {status.tokenError}{" "}
            <a
              href={`/api/auth/spotify/login?tenantId=${encodeURIComponent(tenantId)}`}
              className="font-bold underline"
            >
              Reconectar
            </a>
          </p>
        )}

        {feedback && (
          <p
            className={`mt-4 text-sm font-semibold ${
              feedback.type === "ok" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>

      <div className="minimal-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          Trilha das telas
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tocando agora:{" "}
          <strong className="text-[var(--text-primary)]">
            {status.playlistName || "nenhuma playlist escolhida"}
          </strong>
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={manualUrl}
            onChange={(event) => setManualUrl(event.target.value)}
            placeholder="Cole o link de uma playlist, álbum ou artista do Spotify"
            className="minimal-input flex-1 px-4 py-3"
          />
          <button
            type="button"
            onClick={() => post({ action: "set-playlist", playlistUrl: manualUrl })}
            disabled={isSaving || !manualUrl.trim()}
            className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Usar este link
          </button>
        </div>

        {status.playlists.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {status.playlists.map((playlist) => {
              const isActive = playlist.uri === status.contextUri;
              return (
                <li key={playlist.uri}>
                  <button
                    type="button"
                    onClick={() =>
                      post({
                        action: "set-playlist",
                        contextUri: playlist.uri,
                        playlistName: playlist.name,
                      })
                    }
                    disabled={isSaving}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                      isActive ? "bg-emerald-500/10 ring-1 ring-emerald-500" : "hover:bg-black/5"
                    }`}
                  >
                    {playlist.imageUrl ? (
                      <img
                        src={playlist.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10">
                        <Music2 className="h-5 w-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{playlist.name}</span>
                      <span className="block text-xs text-[var(--text-secondary)]">
                        {playlist.trackCount} faixas
                      </span>
                    </span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
