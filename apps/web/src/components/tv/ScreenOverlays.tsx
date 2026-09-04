"use client";

import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { QrCode } from "@/components/QrCode";
import type { ScreenBootstrap, ScreenOverlays as Overlays } from "@/lib/types";
import type { NowPlaying } from "@/hooks/useSpotifyPlayer";

interface ScreenOverlaysProps {
  overlays: Overlays;
  tenant: ScreenBootstrap["tenant"];
  nowPlaying: NowPlaying | null;
  /** Título do item de mídia no ar, exibido junto ao relógio. */
  mediaTitle?: string;
}

/** Relógio no fuso do estabelecimento — quem assiste está naquele local. */
function Clock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Renderiza só no cliente: a hora do servidor não vale para a tela.
  if (!now) return null;

  let formatted: string;
  try {
    formatted = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(now);
  } catch {
    // Fuso inválido cadastrado: cai no horário local do dispositivo.
    formatted = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);
  }

  return <span className="text-3xl font-bold tabular-nums text-white drop-shadow-lg">{formatted}</span>;
}

/** Chamada promocional com QR Code, exibida em ciclos configurados no painel. */
function CtaCard({ overlays, primaryColor }: { overlays: Overlays; primaryColor: string }) {
  return (
    <div className="flex max-w-xl items-center gap-6 rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur">
      {overlays.ctaUrl ? (
        <QrCode value={overlays.ctaUrl} size={150} className="rounded-xl" />
      ) : null}
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-tight" style={{ color: primaryColor }}>
          {overlays.ctaTitle}
        </p>
        <p className="mt-2 text-base leading-snug text-slate-600">{overlays.ctaSubtitle}</p>
      </div>
    </div>
  );
}

export function ScreenOverlays({ overlays, tenant, nowPlaying, mediaTitle }: ScreenOverlaysProps) {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    if (!overlays.ctaEnabled) {
      setShowCta(false);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout>;

    const showCycle = setInterval(() => {
      setShowCta(true);
      hideTimer = setTimeout(() => setShowCta(false), overlays.ctaDurationSeconds * 1000);
    }, overlays.ctaIntervalMinutes * 60 * 1000);

    return () => {
      clearInterval(showCycle);
      clearTimeout(hideTimer);
    };
  }, [overlays.ctaEnabled, overlays.ctaIntervalMinutes, overlays.ctaDurationSeconds]);

  const hasTrack = !!nowPlaying?.trackName && !nowPlaying.isPaused;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Topo: marca do estabelecimento e relógio */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-8">
        <div className="flex items-center gap-4">
          {overlays.showLogo && tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-16 w-auto rounded-xl bg-white/90 object-contain p-2 shadow-lg"
            />
          ) : overlays.showLogo ? (
            <span className="rounded-xl bg-black/40 px-4 py-2 text-xl font-extrabold text-white backdrop-blur">
              {tenant.name}
            </span>
          ) : null}
        </div>

        {overlays.showClock && (
          <div className="rounded-xl bg-black/40 px-4 py-2 backdrop-blur">
            <Clock timezone={tenant.timezone} />
          </div>
        )}
      </div>

      {/* Base: faixa tocando e título da mídia */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-8">
        {overlays.showNowPlaying && hasTrack ? (
          <div className="flex items-center gap-4 rounded-2xl bg-black/50 p-3 pr-6 backdrop-blur">
            {nowPlaying?.albumArtUrl ? (
              <img
                src={nowPlaying.albumArtUrl}
                alt=""
                className="h-14 w-14 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500">
                <Music2 className="h-6 w-6 text-white" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white">{nowPlaying?.trackName}</p>
              <p className="truncate text-sm text-white/70">{nowPlaying?.artistName}</p>
            </div>
          </div>
        ) : (
          <span />
        )}

        {mediaTitle ? (
          <span className="rounded-xl bg-black/40 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur">
            {mediaTitle}
          </span>
        ) : null}
      </div>

      {/* Chamada promocional */}
      {showCta && overlays.ctaEnabled && (
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <CtaCard overlays={overlays} primaryColor={tenant.primaryColor} />
        </div>
      )}
    </div>
  );
}
