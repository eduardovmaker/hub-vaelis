"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { MediaAsset, Playlist, PlaylistItem } from "@/lib/types";

/** Montagem da programação: quais mídias entram, em que ordem e por quanto tempo. */
export function PlaylistTab({ tenantId }: { tenantId: string }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [playlistRes, mediaRes] = await Promise.all([
          fetch(`/api/tenant/${tenantId}/playlists`, { cache: "no-store" }),
          fetch(`/api/tenant/${tenantId}/media`, { cache: "no-store" }),
        ]);
        const playlistData = await playlistRes.json().catch(() => ({}));
        const mediaData = await mediaRes.json().catch(() => ({}));

        const loaded: Playlist[] = playlistData.playlists || [];
        setPlaylists(loaded);
        setAssets(mediaData.assets || []);

        const first = loaded[0];
        if (first) {
          setSelectedId(first.id);
          setItems(first.items || []);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenantId]);

  function selectPlaylist(playlist: Playlist) {
    if (isDirty && !window.confirm("Há alterações não salvas. Trocar de playlist e descartar?")) {
      return;
    }
    setSelectedId(playlist.id);
    setItems(playlist.items || []);
    setIsDirty(false);
    setFeedback(null);
  }

  async function createPlaylist() {
    const name = window.prompt("Nome da nova playlist:");
    if (!name?.trim()) return;

    const res = await fetch(`/api/tenant/${tenantId}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.success) {
      setFeedback(data.error || "Não foi possível criar a playlist.");
      return;
    }

    setPlaylists((current) => [...current, data.playlist]);
    setSelectedId(data.playlist.id);
    setItems([]);
    setIsDirty(false);
  }

  function addAsset(asset: MediaAsset) {
    const item: PlaylistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId: asset.id,
      title: asset.title,
      type: asset.type,
      url: asset.url,
      // Vídeo toca até o fim; o valor abaixo governa apenas imagens.
      durationSeconds: asset.type === "video" ? asset.durationSeconds || 15 : 10,
      active: true,
      muteAudio: true,
      order: items.length + 1,
    };
    setItems((current) => [...current, item]);
    setIsDirty(true);
  }

  function updateItem(id: string, patch: Partial<PlaylistItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setIsDirty(true);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setIsDirty(true);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, position) => ({ ...item, order: position + 1 }));
    });
    setIsDirty(true);
  }

  async function save() {
    if (!selectedId) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/tenant/${tenantId}/playlists/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.success) {
        setFeedback(data.error || "Não foi possível salvar.");
        return;
      }

      setPlaylists((current) =>
        current.map((playlist) => (playlist.id === selectedId ? data.playlist : playlist))
      );
      setItems(data.playlist.items || []);
      setIsDirty(false);
      setFeedback(data.message || "Playlist salva.");
    } finally {
      setIsSaving(false);
    }
  }

  async function makeDefault() {
    if (!selectedId) return;
    const res = await fetch(`/api/tenant/${tenantId}/playlists/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setPlaylists((current) =>
        current.map((playlist) => ({ ...playlist, isDefault: playlist.id === selectedId }))
      );
      setFeedback("Esta é a playlist padrão das telas.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  const selected = playlists.find((playlist) => playlist.id === selectedId) || null;
  const usedAssetIds = new Set(items.map((item) => item.assetId));

  return (
    <section className="space-y-6">
      <div className="minimal-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => selectPlaylist(playlist)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                playlist.id === selectedId
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10"
              }`}
            >
              {playlist.isDefault && <Star className="h-3.5 w-3.5" />}
              {playlist.name}
            </button>
          ))}
          <button
            type="button"
            onClick={createPlaylist}
            className="flex items-center gap-1 rounded-xl border border-dashed border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          >
            <Plus className="h-4 w-4" />
            Nova
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selected && !selected.isDefault && (
            <button
              type="button"
              onClick={makeDefault}
              className="rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
            >
              Tornar padrão
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!selectedId || isSaving || !isDirty}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isDirty ? "Salvar alterações" : "Salvo"}
          </button>
        </div>
      </div>

      {feedback && <p className="text-sm font-semibold text-[var(--brand-primary)]">{feedback}</p>}

      {!selected ? (
        <p className="minimal-card p-8 text-center text-sm text-[var(--text-secondary)]">
          Crie uma playlist para montar a programação da tela.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Itens da programação */}
          <div className="minimal-card p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Programação · {items.length} {items.length === 1 ? "item" : "itens"}
            </h3>

            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                Adicione mídias da biblioteca ao lado.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={item.id} className="rounded-2xl bg-black/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label="Subir"
                          className="rounded p-1 disabled:opacity-25"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === items.length - 1}
                          aria-label="Descer"
                          className="rounded p-1 disabled:opacity-25"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {index + 1}. {item.title}
                        </p>
                        <p className="mt-0.5 text-xs uppercase text-[var(--text-secondary)]">
                          {item.type === "video" ? "Vídeo" : "Imagem"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {item.type === "image" && (
                            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              Duração
                              <input
                                type="number"
                                min={3}
                                max={600}
                                value={item.durationSeconds}
                                onChange={(event) =>
                                  updateItem(item.id, {
                                    durationSeconds: Number(event.target.value) || 10,
                                  })
                                }
                                className="minimal-input w-20 px-2 py-1"
                              />
                              s
                            </label>
                          )}

                          {item.type === "video" && (
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, { muteAudio: !item.muteAudio })}
                              className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-xs font-semibold"
                            >
                              {item.muteAudio ? (
                                <>
                                  <VolumeX className="h-3.5 w-3.5" />
                                  Mudo (mantém a música)
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3.5 w-3.5" />
                                  Com áudio (pausa a música)
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { active: !item.active })}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                              item.active
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-black/5 text-[var(--text-secondary)]"
                            }`}
                          >
                            {item.active ? <Check className="h-3.5 w-3.5" /> : null}
                            {item.active ? "No ar" : "Pausado"}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remover ${item.title}`}
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Biblioteca disponível */}
          <div className="minimal-card p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Biblioteca
            </h3>

            {assets.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                Envie mídias na aba Biblioteca.
              </p>
            ) : (
              <ul className="space-y-2">
                {assets.map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => addAsset(asset)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-black/5"
                    >
                      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-black">
                        {asset.type === "video" ? (
                          <video src={asset.url} className="h-full w-full object-cover" muted preload="metadata" />
                        ) : (
                          <img src={asset.url} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{asset.title}</span>
                        <span className="block text-xs text-[var(--text-secondary)]">
                          {usedAssetIds.has(asset.id) ? "Já na programação" : "Adicionar"}
                        </span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
