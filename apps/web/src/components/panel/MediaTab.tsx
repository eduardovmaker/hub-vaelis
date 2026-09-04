"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { formatBytes, uploadMediaAsset } from "@/lib/uploadClient";
import type { MediaAsset } from "@/lib/types";

const ACCEPTED = "video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp";

/** Biblioteca de mídias do estabelecimento, armazenadas no Cloudflare R2. */
export function MediaTab({ tenantId }: { tenantId: string }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "ok" | "erro"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadAssets() {
    try {
      const res = await fetch(`/api/tenant/${tenantId}/media`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data.success) setAssets(data.assets || []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFeedback(null);

    for (const file of Array.from(files)) {
      setUploadingName(file.name);
      setPercent(0);
      try {
        const asset = await uploadMediaAsset({
          tenantId,
          file,
          title: file.name.replace(/\.[^.]+$/, ""),
          onProgress: ({ percent: value }) => setPercent(value),
        });
        setAssets((current) => [asset, ...current]);
      } catch (error) {
        setFeedback({
          type: "erro",
          message: error instanceof Error ? error.message : "Falha no envio.",
        });
      }
    }

    setUploadingName(null);
    setPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(asset: MediaAsset) {
    const confirmed = window.confirm(
      `Excluir "${asset.title}"? O arquivo sai da biblioteca e do Cloudflare R2.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/tenant/${tenantId}/media?assetId=${asset.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    if (data.success) {
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setFeedback({ type: "ok", message: data.message || "Mídia excluída." });
    } else {
      setFeedback({ type: "erro", message: data.error || "Não foi possível excluir." });
    }
  }

  return (
    <section className="space-y-6">
      <div className="minimal-card p-6">
        <h2 className="text-lg font-bold">Biblioteca de mídias</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Vídeos e imagens ficam no Cloudflare R2. O envio vai direto do navegador para o bucket,
          então arquivos grandes não passam pelo servidor.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadingName}
          className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {uploadingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploadingName ? "Enviando..." : "Enviar vídeo ou imagem"}
        </button>

        {uploadingName && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span className="truncate">{uploadingName}</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : assets.length === 0 ? (
        <p className="minimal-card p-8 text-center text-sm text-[var(--text-secondary)]">
          Nenhuma mídia enviada ainda.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <article key={asset.id} className="minimal-card overflow-hidden">
              <div className="flex h-40 items-center justify-center bg-black">
                {asset.type === "video" ? (
                  <video src={asset.url} className="h-full w-full object-cover" muted preload="metadata" />
                ) : (
                  <img src={asset.url} alt={asset.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{asset.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      {asset.type === "video" ? (
                        <Film className="h-3.5 w-3.5" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                      )}
                      {formatBytes(asset.sizeBytes)}
                      {asset.durationSeconds ? ` · ${asset.durationSeconds}s` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(asset)}
                    aria-label={`Excluir ${asset.title}`}
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
