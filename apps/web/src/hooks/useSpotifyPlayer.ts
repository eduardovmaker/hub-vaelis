"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Web Playback SDK do Spotify dentro da tela.
 *
 * A tela se registra como um dispositivo Spotify, então o painel pode mandar
 * tocar, pausar e trocar faixa remotamente. Exige conta Premium e um toque na
 * tela para liberar o áudio (política de autoplay dos navegadores).
 */

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";

interface SpotifyPlayerHandle {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  activateElement?: () => Promise<void>;
  addListener: (event: string, cb: (payload: never) => void) => boolean;
  removeListener: (event: string) => boolean;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerHandle;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;

/** Carrega o script do SDK uma única vez por página. */
function loadSpotifySdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Spotify) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();

    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("Não foi possível carregar o player do Spotify."));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export interface NowPlaying {
  trackName: string;
  artistName: string;
  albumArtUrl: string;
  isPaused: boolean;
}

export interface UseSpotifyPlayerOptions {
  /** Nome exibido na lista de dispositivos do Spotify. */
  deviceName: string;
  /** Busca um access token novo; chamado também quando o atual expira. */
  fetchAccessToken: () => Promise<string | null>;
  /** Recebe o device_id assim que a tela é aceita como dispositivo. */
  onDeviceReady: (deviceId: string) => void;
  volumePercent: number;
  enabled: boolean;
}

export interface UseSpotifyPlayerResult {
  ready: boolean;
  error: string | null;
  nowPlaying: NowPlaying | null;
  /** Libera o áudio depois do toque do usuário na tela. */
  activate: () => Promise<void>;
  duck: () => Promise<void>;
  unduck: () => Promise<void>;
}

export function useSpotifyPlayer(options: UseSpotifyPlayerOptions): UseSpotifyPlayerResult {
  const { deviceName, fetchAccessToken, onDeviceReady, volumePercent, enabled } = options;

  const playerRef = useRef<SpotifyPlayerHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  // Mantém os callbacks atuais sem recriar o player a cada render.
  const fetchTokenRef = useRef(fetchAccessToken);
  const onDeviceReadyRef = useRef(onDeviceReady);
  fetchTokenRef.current = fetchAccessToken;
  onDeviceReadyRef.current = onDeviceReady;

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let player: SpotifyPlayerHandle | null = null;

    async function boot() {
      try {
        await loadSpotifySdk();
        if (disposed || !window.Spotify) return;

        player = new window.Spotify.Player({
          name: deviceName,
          volume: Math.max(0, Math.min(100, volumePercent)) / 100,
          getOAuthToken: (cb) => {
            fetchTokenRef.current()
              .then((token) => {
                if (token) cb(token);
                else setError("Conta Spotify não conectada para este estabelecimento.");
              })
              .catch(() => setError("Falha ao renovar o acesso ao Spotify."));
          },
        });

        player.addListener("ready", ((payload: { device_id: string }) => {
          if (disposed) return;
          setReady(true);
          setError(null);
          onDeviceReadyRef.current(payload.device_id);
        }) as never);

        player.addListener("not_ready", (() => {
          if (!disposed) setReady(false);
        }) as never);

        player.addListener("player_state_changed", ((state: {
          paused: boolean;
          track_window?: {
            current_track?: {
              name?: string;
              artists?: { name: string }[];
              album?: { images?: { url: string }[] };
            };
          };
        } | null) => {
          if (disposed || !state) return;
          const track = state.track_window?.current_track;
          setNowPlaying({
            trackName: track?.name || "",
            artistName: (track?.artists || []).map((a) => a.name).join(", "),
            albumArtUrl: track?.album?.images?.[0]?.url || "",
            isPaused: state.paused,
          });
        }) as never);

        // Sem Premium o SDK recusa a inicialização com este erro.
        player.addListener("account_error", (() => {
          if (!disposed) setError("A conta Spotify precisa ser Premium para tocar na tela.");
        }) as never);

        player.addListener("authentication_error", (() => {
          if (!disposed) setError("Autorização do Spotify expirada. Reconecte a conta no painel.");
        }) as never);

        player.addListener("initialization_error", (() => {
          if (!disposed) {
            setError("Este navegador não suporta o player do Spotify. Use Chrome no dispositivo da TV.");
          }
        }) as never);

        player.addListener("playback_error", (() => {
          if (!disposed) setError("O Spotify recusou a reprodução nesta tela.");
        }) as never);

        playerRef.current = player;
        await player.connect();
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Falha ao iniciar o player do Spotify.");
        }
      }
    }

    boot();

    return () => {
      disposed = true;
      // Libera o dispositivo para não ficar fantasma na lista do Spotify.
      player?.disconnect();
      playerRef.current = null;
    };
  }, [enabled, deviceName, volumePercent]);

  useEffect(() => {
    playerRef.current?.setVolume(Math.max(0, Math.min(100, volumePercent)) / 100).catch(() => {});
  }, [volumePercent]);

  /**
   * `activateElement` precisa acontecer dentro do gesto do usuário: é o que
   * autoriza o navegador da TV a emitir som.
   */
  const activate = useCallback(async () => {
    const player = playerRef.current;
    if (!player?.activateElement) return;
    try {
      await player.activateElement();
    } catch {
      // Navegador que não exige o passo apenas ignora.
    }
  }, []);

  /** Pausa a música enquanto um vídeo com áudio próprio está no ar. */
  const duck = useCallback(async () => {
    try {
      await playerRef.current?.pause();
    } catch {
      /* nada a fazer: o vídeo continua tocando */
    }
  }, []);

  const unduck = useCallback(async () => {
    try {
      await playerRef.current?.resume();
    } catch {
      /* a música volta no próximo comando do painel */
    }
  }, []);

  return { ready, error, nowPlaying, activate, duck, unduck };
}
