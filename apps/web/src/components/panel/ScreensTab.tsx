"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Monitor,
  Pause,
  Play,
  Plus,
  RefreshCw,
  SkipForward,
  Trash2,
  Unlink,
  Volume2,
} from "lucide-react";
import type { Playlist, Screen, ScreenOverlays } from "@/lib/types";

/** A tela como o painel a vê: sem o segredo do dispositivo, com status online. */
type PanelScreen = Omit<Screen, "deviceSecret"> & { online: boolean };

const REFRESH_MS = 30_000;

export function ScreensTab({ tenantId }: { tenantId: string }) {
  const [screens, setScreens] = useState<PanelScreen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyScreenId, setBusyScreenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "erro"; message: string } | null>(null);
  const [newName, setNewName] = useState("");

  const loadScreens = useCallback(async () => {
    const res = await fetch(`/api/tenant/${tenantId}/screens`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (data.success) setScreens(data.screens || []);
  }, [tenantId]);

  useEffect(() => {
    async function load() {
      try {
        const playlistRes = await fetch(`/api/tenant/${tenantId}/playlists`, { cache: "no-store" });
        const playlistData = await playlistRes.json().catch(() => ({}));
        setPlaylists(playlistData.playlists || []);
        await loadScreens();
      } finally {
        setIsLoading(false);
      }
    }
    load();

    // O status online vem do heartbeat: revalida periodicamente.
    const timer = setInterval(loadScreens, REFRESH_MS);
    return () => clearInterval(timer);
  }, [tenantId, loadScreens]);

  async function createScreen() {
    if (!newName.trim()) return;
    setBusyScreenId("new");

    try {
      const res = await fetch(`/api/tenant/${tenantId}/screens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.success) {
        setFeedback({ type: "erro", message: data.error || "Não foi possível criar a tela." });
        return;
      }

      setScreens((current) => [...current, data.screen]);
      setNewName("");
      setFeedback({ type: "ok", message: data.message });
    } finally {
      setBusyScreenId(null);
    }
  }

  async function patchScreen(screenId: string, body: Record<string, unknown>) {
    setBusyScreenId(screenId);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/screens/${screenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.success) {
        setFeedback({ type: "erro", message: data.error || "Não foi possível salvar." });
        return;
      }

      setScreens((current) =>
        current.map((screen) => (screen.id === screenId ? data.screen : screen))
      );
      if (data.message) setFeedback({ type: "ok", message: data.message });
    } finally {
      setBusyScreenId(null);
    }
  }

  async function deleteScreen(screen: PanelScreen) {
    if (!window.confirm(`Remover a tela "${screen.name}"?`)) return;

    const res = await fetch(`/api/tenant/${tenantId}/screens/${screen.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setScreens((current) => current.filter((item) => item.id !== screen.id));
    }
  }

  /** Comandos de música vão para o device_id que aquela tela registrou. */
  async function sendPlayback(
    screenId: string,
    action: "play" | "pause" | "next" | "volume",
    volumePercent?: number
  ) {
    setBusyScreenId(screenId);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/spotify/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, screenId, volumePercent }),
      });
      const data = await res.json().catch(() => ({}));
      setFeedback(
        data.success
          ? { type: "ok", message: "Comando enviado à tela." }
          : { type: "erro", message: data.error || "O comando não foi aceito." }
      );
    } finally {
      setBusyScreenId(null);
    }
  }

  function updateOverlay(screen: PanelScreen, patch: Partial<ScreenOverlays>) {
    patchScreen(screen.id, { overlays: { ...screen.overlays, ...patch } });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="minimal-card p-6">
        <h2 className="text-lg font-bold">Telas instaladas</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Cada TV recebe um código de pareamento. No dispositivo da TV, abra o endereço do player e
          digite o código uma única vez.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nome da tela (ex: TV da recepção)"
            className="minimal-input flex-1 px-4 py-3"
          />
          <button
            type="button"
            onClick={createScreen}
            disabled={!newName.trim() || busyScreenId === "new"}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busyScreenId === "new" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar tela
          </button>
        </div>

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

      {screens.length === 0 ? (
        <p className="minimal-card p-8 text-center text-sm text-[var(--text-secondary)]">
          Nenhuma tela cadastrada.
        </p>
      ) : (
        <div className="space-y-5">
          {screens.map((screen) => {
            const isBusy = busyScreenId === screen.id;

            return (
              <article key={screen.id} className="minimal-card p-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                      <Monitor className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold">{screen.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`minimal-badge ${
                            screen.online
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-black/5 text-[var(--text-secondary)]"
                          }`}
                        >
                          {screen.online ? "No ar" : "Offline"}
                        </span>
                        {screen.paired ? (
                          <span className="text-[var(--text-secondary)]">
                            Pareada
                            {screen.lastSeenAt
                              ? ` · última vez ${new Date(screen.lastSeenAt).toLocaleString("pt-BR")}`
                              : ""}
                          </span>
                        ) : (
                          <span className="font-mono text-base font-black tracking-widest text-[var(--brand-primary)]">
                            {screen.pairingCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patchScreen(screen.id, { action: "unpair" })}
                      disabled={isBusy}
                      title="Gerar novo código e desvincular a TV atual"
                      className="flex items-center gap-1.5 rounded-xl bg-black/5 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      Desvincular
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteScreen(screen)}
                      aria-label={`Remover ${screen.name}`}
                      className="rounded-xl p-2 text-red-500 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {/* Programação e música */}
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        Playlist exibida
                      </span>
                      <select
                        value={screen.playlistId || ""}
                        onChange={(event) =>
                          patchScreen(screen.id, { playlistId: event.target.value || null })
                        }
                        className="minimal-input w-full px-4 py-2.5"
                      >
                        <option value="">Usar a playlist padrão</option>
                        {playlists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id}>
                            {playlist.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        Orientação da imagem
                      </span>
                      <select
                        value={screen.orientation}
                        onChange={(event) =>
                          patchScreen(screen.id, { orientation: event.target.value })
                        }
                        className="minimal-input w-full px-4 py-2.5"
                      >
                        <option value="LANDSCAPE">Horizontal (padrão)</option>
                        <option value="PORTRAIT">Vertical — girar 90°</option>
                      </select>
                      <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">
                        Use vertical apenas se a TV estiver montada de pé e o próprio aparelho não
                        girar a imagem.
                      </span>
                    </label>

                    <div className="rounded-2xl bg-black/[0.03] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">Música do Spotify</span>
                        <button
                          type="button"
                          onClick={() => patchScreen(screen.id, { musicEnabled: !screen.musicEnabled })}
                          className={`minimal-badge ${
                            screen.musicEnabled
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-black/5 text-[var(--text-secondary)]"
                          }`}
                        >
                          {screen.musicEnabled ? "Ativada" : "Desativada"}
                        </button>
                      </div>

                      {screen.musicEnabled && (
                        <>
                          <div className="mt-4 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => sendPlayback(screen.id, "play")}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Tocar
                            </button>
                            <button
                              type="button"
                              onClick={() => sendPlayback(screen.id, "pause")}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 rounded-xl bg-black/5 px-4 py-2 text-xs font-bold disabled:opacity-40"
                            >
                              <Pause className="h-3.5 w-3.5" />
                              Pausar
                            </button>
                            <button
                              type="button"
                              onClick={() => sendPlayback(screen.id, "next")}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 rounded-xl bg-black/5 px-4 py-2 text-xs font-bold disabled:opacity-40"
                            >
                              <SkipForward className="h-3.5 w-3.5" />
                              Pular
                            </button>
                          </div>

                          <label className="mt-4 block">
                            <span className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                              <Volume2 className="h-3.5 w-3.5" />
                              Volume · {screen.volumePercent}%
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={screen.volumePercent}
                              onChange={(event) =>
                                setScreens((current) =>
                                  current.map((item) =>
                                    item.id === screen.id
                                      ? { ...item, volumePercent: Number(event.target.value) }
                                      : item
                                  )
                                )
                              }
                              onMouseUp={(event) =>
                                sendPlayback(
                                  screen.id,
                                  "volume",
                                  Number((event.target as HTMLInputElement).value)
                                )
                              }
                              onTouchEnd={(event) =>
                                sendPlayback(
                                  screen.id,
                                  "volume",
                                  Number((event.target as HTMLInputElement).value)
                                )
                              }
                              className="w-full"
                            />
                          </label>

                          {!screen.spotifyDeviceId && (
                            <p className="mt-3 flex items-start gap-2 text-xs text-amber-600">
                              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              A tela ainda não apareceu como dispositivo Spotify. Abra o player na TV
                              e toque em Iniciar exibição.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Overlays */}
                  <div className="space-y-3 rounded-2xl bg-black/[0.03] p-4">
                    <span className="block text-sm font-bold">Informações sobre a mídia</span>

                    {(
                      [
                        ["showClock", "Relógio"],
                        ["showLogo", "Logo do estabelecimento"],
                        ["showNowPlaying", "Faixa que está tocando"],
                        ["ctaEnabled", "Chamada promocional com QR Code"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between gap-3 text-sm">
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={!!screen.overlays[key]}
                          onChange={(event) => updateOverlay(screen, { [key]: event.target.checked })}
                          className="h-4 w-4 accent-[var(--brand-primary)]"
                        />
                      </label>
                    ))}

                    {screen.overlays.ctaEnabled && (
                      <div className="space-y-2 border-t border-[var(--border-color)] pt-3">
                        <input
                          defaultValue={screen.overlays.ctaTitle}
                          onBlur={(event) => updateOverlay(screen, { ctaTitle: event.target.value })}
                          placeholder="Título da chamada"
                          className="minimal-input w-full px-3 py-2 text-sm"
                        />
                        <input
                          defaultValue={screen.overlays.ctaSubtitle}
                          onBlur={(event) => updateOverlay(screen, { ctaSubtitle: event.target.value })}
                          placeholder="Texto de apoio"
                          className="minimal-input w-full px-3 py-2 text-sm"
                        />
                        <input
                          defaultValue={screen.overlays.ctaUrl}
                          onBlur={(event) => updateOverlay(screen, { ctaUrl: event.target.value })}
                          placeholder="Link do QR Code (Instagram, cardápio, agendamento)"
                          className="minimal-input w-full px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <label className="flex-1 text-xs text-[var(--text-secondary)]">
                            A cada (min)
                            <input
                              type="number"
                              min={1}
                              max={120}
                              defaultValue={screen.overlays.ctaIntervalMinutes}
                              onBlur={(event) =>
                                updateOverlay(screen, {
                                  ctaIntervalMinutes: Number(event.target.value) || 5,
                                })
                              }
                              className="minimal-input mt-1 w-full px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="flex-1 text-xs text-[var(--text-secondary)]">
                            Duração (s)
                            <input
                              type="number"
                              min={3}
                              max={120}
                              defaultValue={screen.overlays.ctaDurationSeconds}
                              onBlur={(event) =>
                                updateOverlay(screen, {
                                  ctaDurationSeconds: Number(event.target.value) || 15,
                                })
                              }
                              className="minimal-input mt-1 w-full px-3 py-2 text-sm"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
