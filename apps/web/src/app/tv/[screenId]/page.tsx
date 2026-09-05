"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, MonitorPlay, Play, WifiOff } from "lucide-react";
import { ScreenOverlays } from "@/components/tv/ScreenOverlays";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import {
  clearDeviceCredential,
  readCachedBootstrap,
  readDeviceCredential,
  writeCachedBootstrap,
} from "@/lib/deviceStore";
import { DEFAULT_OVERLAYS, type PlaylistItem, type ScreenBootstrap } from "@/lib/types";

/** Intervalo de presença. O painel considera a tela offline após 2 minutos. */
const HEARTBEAT_MS = 45_000;
/** Frequência com que a tela busca playlist e configuração novas. */
const RESYNC_MS = 60_000;

/**
 * Player de mídia indoor.
 *
 * Exibe a playlist de vídeos e imagens hospedada no Cloudflare R2 e mantém a
 * trilha do Spotify tocando por cima, pausando a música apenas quando entra um
 * vídeo que tem áudio próprio.
 */
export default function ScreenPlayerPage({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = use(params);
  const router = useRouter();

  const [bootstrap, setBootstrap] = useState<ScreenBootstrap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [precisaFundoDesfocado, setPrecisaFundoDesfocado] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const secretRef = useRef<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const credential = readDeviceCredential();
    if (!credential || credential.screenId !== screenId) {
      router.replace("/tv");
      return;
    }
    secretRef.current = credential.deviceSecret;

    // Enquanto a primeira resposta não chega, a tela já desenha o cache local.
    const cached = readCachedBootstrap<ScreenBootstrap>(screenId);
    if (cached) setBootstrap(cached);
  }, [screenId, router]);

  const authedFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const secret = secretRef.current;
      if (!secret) throw new Error("Tela não pareada.");

      return fetch(path, {
        ...init,
        cache: "no-store",
        headers: { ...(init.headers || {}), "x-device-secret": secret },
      });
    },
    []
  );

  /** Busca configuração e playlist. Mantém o que está no ar se a rede cair. */
  const syncBootstrap = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/screen/${screenId}`);

      if (res.status === 401 || res.status === 404) {
        // Tela removida ou desvinculada no painel: volta para o pareamento.
        clearDeviceCredential();
        router.replace("/tv");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setLoadError(data.error || "Não foi possível carregar a configuração da tela.");
        return;
      }

      const next: ScreenBootstrap = {
        screen: data.screen,
        tenant: data.tenant,
        playlist: data.playlist || [],
        music: data.music,
      };

      setBootstrap((current) => {
        // Só reinicia a exibição quando a playlist realmente mudou.
        const samePlaylist =
          JSON.stringify(current?.playlist || []) === JSON.stringify(next.playlist);
        if (!samePlaylist) setIndex(0);
        return next;
      });

      writeCachedBootstrap(screenId, next);
      setLoadError(null);
      setIsOffline(false);
    } catch {
      // Continua tocando o que já está carregado; só sinaliza a queda.
      setIsOffline(true);
    }
  }, [authedFetch, screenId, router]);

  useEffect(() => {
    if (!secretRef.current) return;
    syncBootstrap();
    const timer = setInterval(syncBootstrap, RESYNC_MS);
    return () => clearInterval(timer);
  }, [syncBootstrap]);

  const playlist = useMemo<PlaylistItem[]>(() => bootstrap?.playlist || [], [bootstrap]);
  const currentItem = playlist.length > 0 ? playlist[index % playlist.length] : null;

  const overlays = { ...DEFAULT_OVERLAYS, ...(bootstrap?.screen.overlays || {}) };
  const musicEnabled = !!bootstrap?.music.enabled && !!bootstrap?.music.connected;
  const isPortrait = bootstrap?.screen.orientation === "PORTRAIT";

  /**
   * Compara a proporção da mídia com a da área de exibição para saber se
   * sobraria tarja. Só nesse caso vale montar o fundo desfocado.
   *
   * A medida sai do próprio elemento, não da janela: assim já considera a
   * rotação aplicada em telas verticais.
   */
  const avaliarProporcao = useCallback(
    (larguraMidia: number, alturaMidia: number, elemento: HTMLElement) => {
      const larguraArea = elemento.clientWidth;
      const alturaArea = elemento.clientHeight;

      if (!larguraMidia || !alturaMidia || !larguraArea || !alturaArea) return;

      const proporcaoMidia = larguraMidia / alturaMidia;
      const proporcaoArea = larguraArea / alturaArea;

      // Diferença mínima não gera tarja perceptível.
      setPrecisaFundoDesfocado(Math.abs(proporcaoMidia - proporcaoArea) > 0.05);
    },
    []
  );

  const fetchSpotifyToken = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/screen/${screenId}/spotify-token`);
      const data = await res.json().catch(() => ({}));
      return res.ok && data.success ? (data.accessToken as string) : null;
    } catch {
      return null;
    }
  }, [authedFetch, screenId]);

  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);

  const handleDeviceReady = useCallback((deviceId: string) => {
    setSpotifyDeviceId(deviceId);
  }, []);

  const {
    error: spotifyError,
    nowPlaying,
    activate: activateSpotify,
    duck,
    unduck,
  } = useSpotifyPlayer({
    deviceName: bootstrap ? `${bootstrap.tenant.name} — ${bootstrap.screen.name}` : "Vaelis Indoor",
    fetchAccessToken: fetchSpotifyToken,
    onDeviceReady: handleDeviceReady,
    volumePercent: bootstrap?.screen.volumePercent ?? 45,
    // O SDK só sobe depois do gesto de início e com conta conectada.
    enabled: started && musicEnabled,
  });

  /** Presença + device_id do Spotify, para o painel poder comandar a música. */
  useEffect(() => {
    if (!secretRef.current) return;

    async function beat() {
      try {
        await authedFetch(`/api/screen/${screenId}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(spotifyDeviceId ? { spotifyDeviceId } : {}),
        });
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    }

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [authedFetch, screenId, spotifyDeviceId]);

  /** Avança a playlist: imagem por tempo, vídeo ao terminar. */
  const advance = useCallback(() => {
    setIndex((current) => (playlist.length === 0 ? 0 : (current + 1) % playlist.length));
  }, [playlist.length]);

  useEffect(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (!started || !currentItem || currentItem.type !== "image") return;

    advanceTimer.current = setTimeout(advance, currentItem.durationSeconds * 1000);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [started, currentItem, advance]);

  /**
   * Vídeo com áudio próprio pausa a música; ao sair dele, a música volta.
   * Vídeo mudo deixa a trilha do Spotify seguir sem interrupção.
   */
  useEffect(() => {
    if (!started || !musicEnabled) return;

    const videoHasAudio = currentItem?.type === "video" && currentItem.muteAudio === false;
    if (videoHasAudio) duck();
    else unduck();
  }, [started, musicEnabled, currentItem, duck, unduck]);

  /** Troca de mídia: recarrega o vídeo e dispara a reprodução. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !started || currentItem?.type !== "video") return;

    video.currentTime = 0;
    const attempt = video.play();
    if (attempt) {
      attempt.catch(() => {
        // Navegador recusou o autoplay: pula em vez de travar a exibição.
        advance();
      });
    }
  }, [started, currentItem, advance]);

  async function handleStart() {
    setStarted(true);
    // Precisa acontecer dentro do gesto para o navegador liberar o áudio.
    await activateSpotify();
    videoRef.current?.play().catch(() => {});
  }

  if (!bootstrap) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        {loadError ? (
          <>
            <AlertTriangle className="h-10 w-10 text-amber-400" />
            <p className="max-w-md text-center text-sm text-slate-300">{loadError}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
            <p className="text-sm text-slate-400">Carregando a programação da tela...</p>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/*
        Camada de mídia. `object-contain` nunca corta o quadro — conteúdo
        vertical em TV horizontal aparece inteiro, e a sobra fica preenchida
        pelo fundo desfocado logo abaixo em vez de tarja preta.
        Telas marcadas como PORTRAIT giram 90°, para o caso de a TV estar
        montada na vertical sem o sistema operacional rotacionar a imagem.
      */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={
          isPortrait
            ? { width: "100vh", height: "100vw", transform: "translate(-50%, -50%) rotate(90deg)" }
            : { width: "100vw", height: "100vh" }
        }
      >
        {/*
          Fundo desfocado: a própria mídia ampliada e borrada preenche a sobra
          quando a proporção não bate com a da tela — vídeo vertical de
          Reels/Stories em TV horizontal, por exemplo. Só é montado quando
          haveria tarja, para não decodificar o vídeo duas vezes à toa.
        */}
        {precisaFundoDesfocado && currentItem && (
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {currentItem.type === "video" ? (
              <video
                key={`fundo_${currentItem.id}`}
                src={currentItem.url}
                className="h-full w-full scale-110 object-cover blur-2xl brightness-[0.55]"
                autoPlay
                loop
                playsInline
                muted
              />
            ) : (
              <img
                key={`fundo_${currentItem.id}`}
                src={currentItem.url}
                alt=""
                className="h-full w-full scale-110 object-cover blur-2xl brightness-[0.55]"
              />
            )}
          </div>
        )}

        {currentItem ? (
          currentItem.type === "video" ? (
            <video
              ref={videoRef}
              key={currentItem.id}
              src={currentItem.url}
              className="relative h-full w-full object-contain"
              autoPlay
              playsInline
              muted={currentItem.muteAudio !== false}
              onLoadedMetadata={(event) =>
                avaliarProporcao(
                  event.currentTarget.videoWidth,
                  event.currentTarget.videoHeight,
                  event.currentTarget
                )
              }
              onEnded={advance}
              onError={advance}
            />
          ) : (
            <img
              key={currentItem.id}
              src={currentItem.url}
              alt={currentItem.title}
              className="relative h-full w-full object-contain"
              onLoad={(event) =>
                avaliarProporcao(
                  event.currentTarget.naturalWidth,
                  event.currentTarget.naturalHeight,
                  event.currentTarget
                )
              }
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-slate-500">
            <MonitorPlay className="h-16 w-16" />
            <p className="text-lg font-semibold">Nenhuma mídia publicada nesta tela</p>
            <p className="text-sm">Envie vídeos na aba Playlist do painel.</p>
          </div>
        )}
      </div>

      {started && (
        <ScreenOverlays
          overlays={overlays}
          tenant={bootstrap.tenant}
          nowPlaying={nowPlaying}
          mediaTitle={overlays.showNowPlaying ? undefined : currentItem?.title}
        />
      )}

      {/* Gesto inicial: sem ele o navegador da TV não deixa sair som */}
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-slate-950/95 p-8 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold">{bootstrap.tenant.name}</h1>
            <p className="mt-2 text-lg text-slate-400">{bootstrap.screen.name}</p>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleStart}
            className="flex items-center gap-4 rounded-3xl bg-blue-600 px-12 py-6 text-2xl font-bold shadow-2xl outline-none transition hover:bg-blue-500 focus:ring-4 focus:ring-blue-400"
          >
            <Play className="h-8 w-8" />
            Iniciar exibição
          </button>

          <p className="max-w-md text-center text-sm text-slate-400">
            {musicEnabled
              ? "Pressione OK no controle da TV. O toque é exigido uma única vez para liberar o áudio da música."
              : "Pressione OK no controle da TV para começar a exibição."}
          </p>
        </div>
      )}

      {/* Avisos discretos: nunca cobrem a mídia */}
      {started && isOffline && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500/90 px-4 py-2 text-xs font-bold text-black">
          <WifiOff className="h-4 w-4" />
          Sem conexão — exibindo a programação salva
        </div>
      )}

      {started && spotifyError && (
        <div className="absolute right-4 top-24 max-w-xs rounded-xl bg-red-500/90 p-3 text-xs font-semibold text-white">
          {spotifyError}
        </div>
      )}
    </main>
  );
}
