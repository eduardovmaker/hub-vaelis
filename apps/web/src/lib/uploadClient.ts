"use client";

import type { MediaAsset } from "./types";

/**
 * Upload de mídia pelo navegador.
 *
 * O arquivo vai direto para o Cloudflare R2 pela URL presignada — não passa
 * pelo servidor Next, que na Vercel não aceita corpo grande. Depois de gravar,
 * registramos a mídia na biblioteca do estabelecimento.
 */

/** Lê a duração real do vídeo no cliente, para a playlist saber o tempo exato. */
export function readMediaDuration(file: File): Promise<number | undefined> {
  if (!file.type.startsWith("video/")) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const finish = (duration?: number) => {
      URL.revokeObjectURL(url);
      resolve(duration && Number.isFinite(duration) ? Math.round(duration) : undefined);
    };

    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish(undefined);
    video.src = url;
  });
}

export interface UploadProgress {
  /** 0 a 100. */
  percent: number;
}

export async function uploadMediaAsset(options: {
  tenantId: string;
  file: File;
  title: string;
  onProgress?: (progress: UploadProgress) => void;
}): Promise<MediaAsset> {
  const { tenantId, file, title, onProgress } = options;

  const query = new URLSearchParams({
    tenantId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: String(file.size),
    folder: file.type.startsWith("video/") ? "videos" : "imagens",
  });

  const presignRes = await fetch(`/api/upload?${query.toString()}`);
  const presign = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok || !presign.success) {
    throw new Error(presign.error || "Não foi possível preparar o upload.");
  }

  const durationSeconds = await readMediaDuration(file);

  // XHR em vez de fetch: é o que dá progresso de upload no navegador.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.uploadUrl, true);
    // A assinatura inclui o Content-Type: precisa ser exatamente o mesmo.
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({ percent: Math.round((event.loaded / event.total) * 100) });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`O Cloudflare R2 recusou o arquivo (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Falha de rede durante o envio do arquivo."));
    xhr.send(file);
  });

  const registerRes = await fetch(`/api/tenant/${tenantId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      url: presign.publicUrl,
      r2Key: presign.key,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds,
    }),
  });

  const registered = await registerRes.json().catch(() => ({}));
  if (!registerRes.ok || !registered.success) {
    throw new Error(registered.error || "Arquivo enviado, mas não foi registrado na biblioteca.");
  }

  return registered.asset as MediaAsset;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const megabytes = bytes / (1024 * 1024);
  if (megabytes < 1024) return `${megabytes.toFixed(1)} MB`;
  return `${(megabytes / 1024).toFixed(2)} GB`;
}
