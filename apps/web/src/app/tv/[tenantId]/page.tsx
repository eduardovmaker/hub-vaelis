"use client";

import { use, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";
import { 
  INITIAL_TV_CONFIGS, 
  TvMediaItem, 
  TenantTvConfig,
  parseSpotifyEmbedUrl,
  parseYouTubeEmbedUrl
} from "@/mocks/tv";
import { 
  Wifi, 
  Clock, 
  Tv, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Headphones,
  Music,
  Radio,
  Play
} from "lucide-react";

export default function SmartTvPlayer({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId || "tenant_bar_01";
  // Nome derivado do tenantId para uso antes da API responder
  const derivedName = tenantId
    .replace(/^tenant_/, "")
    .replace(/_\d+$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Estado de carregamento inicial
  const [isLoading, setIsLoading] = useState(true);

  // Estado inicial genérico — dados reais vêm da API (Firebase)
  const [tvConfig, setTvConfig] = useState<TenantTvConfig>(
    INITIAL_TV_CONFIGS[tenantId] || {
      tenantId,
      tenantName: derivedName,
      pairingCode: "",
      addonActive: true,
      showQrOverlay: true,
      showClockOverlay: true,
      showRadioBadge: true,
      showTitleOverlay: true,
      showHeaderLogo: true,
      planCycle: "MENSAL",
      paymentStatus: "PAID",
      playlist: [],
      addonStates: {},
    }
  );

  useEffect(() => {
    async function loadTvConfig() {
      // 1. Ler primeiro do LocalStorage para sincronização instantânea entre abas
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("captive_hub_tv_configs");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed[tenantId]) {
              setTvConfig(parsed[tenantId]);
            }
          } catch (e) {}
        }
      }

      // 2. Buscar da API para persistência
      try {
        const res = await fetch(`/api/tv/${tenantId}`);
        const data = await res.json();
        if (data.success && data.tvConfig) {
          setTvConfig((prev) => ({
            ...prev,
            ...data.tvConfig,
          }));
        }
      } catch (err) {
        console.error("Erro ao carregar TV config da API:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTvConfig();
    const pollInterval = setInterval(loadTvConfig, 2000);
    return () => clearInterval(pollInterval);
  }, [tenantId]);

  const portalConfigMock = INITIAL_PORTAL_CONFIGS[tenantId] || INITIAL_PORTAL_CONFIGS["tenant_bar_01"];
  // Usa dados do Firebase (tvConfig) como fonte primária, mock como fallback
  const displayName = tvConfig.tenantName || portalConfigMock.tenantName;
  const primaryColor = tvConfig.primaryColor || portalConfigMock.primaryColor || "#2563EB";
  const wifiSsid = tvConfig.wifiSsid || portalConfigMock.wifiSsid || "WiFi_Gratis";

  const activePlaylist = tvConfig.playlist ? tvConfig.playlist.filter((item) => item.active) : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Checar se o Add-on Rádio Indoor está ativo para este tenant
  const isRadioIndoorActive = tvConfig.addonStates?.["radio-indoor"]?.active ?? true;
  const radioConfig = tvConfig.radioIndoorConfig || {
    provider: "spotify" as const,
    playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    playlistName: "Hits Sertanejo & Pop Barbearia (Spotify)",
    spotIntervalMinutes: 15,
    syncWithSmartTv: true,
    spotMessages: [],
  };
  // CACHE DA PLAYLIST DA RÁDIO INDOOR NO LOCALSTORAGE E STATE MEMOIZADO:
  // Garante que o src do iframe NUNCA recarregue ou interrompa a música durante o auto-avanço de slides ou requisições API.
  // Apenas altera a fonte se o cliente ativamente cadastrar/salvar uma nova playlist no painel.
  const rawPlaylistUrl = radioConfig.playlistUrl || "";
  const provider = radioConfig.provider || "spotify";

  const targetEmbedUrl = useMemo(() => {
    return provider === "spotify"
      ? parseSpotifyEmbedUrl(rawPlaylistUrl)
      : parseYouTubeEmbedUrl(rawPlaylistUrl);
  }, [provider, rawPlaylistUrl]);

  const [activeEmbedUrl, setActiveEmbedUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`captive_hub_radio_embed_${tenantId}`);
      if (cached) return cached;
    }
    return targetEmbedUrl;
  });

  useEffect(() => {
    if (targetEmbedUrl && targetEmbedUrl !== activeEmbedUrl) {
      setActiveEmbedUrl(targetEmbedUrl);
      if (typeof window !== "undefined") {
        localStorage.setItem(`captive_hub_radio_embed_${tenantId}`, targetEmbedUrl);
      }
    }
  }, [targetEmbedUrl, activeEmbedUrl, tenantId]);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("captive_hub_tv_configs");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed[tenantId]) {
            setTvConfig(parsed[tenantId]);
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [tenantId]);

  // Relógio Digital em Tempo Real
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Estado do Popup de CTA Periódico (Ex: Instagram, WhatsApp, Reviews)
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [ctaCountdown, setCtaCountdown] = useState(15);

  const ctaEnabled = tvConfig.customCtaEnabled ?? false;
  const ctaTitle = tvConfig.customCtaTitle || "Siga nosso Instagram!";
  const ctaSubtitle = tvConfig.customCtaSubtitle || "Aponte a câmera do celular para conferir novidades e promoções.";
  const ctaUrl = tvConfig.customCtaUrl || "https://instagram.com";
  const ctaIntervalMinutes = tvConfig.customCtaIntervalMinutes || 5;
  const ctaDurationSeconds = tvConfig.customCtaDurationSeconds || 15;

  // Timer para disparar o CTA de tempos em tempos
  useEffect(() => {
    if (!ctaEnabled) {
      setShowCtaModal(false);
      return;
    }

    const intervalMs = ctaIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      setShowCtaModal(true);
      setCtaCountdown(ctaDurationSeconds);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [ctaEnabled, ctaIntervalMinutes, ctaDurationSeconds]);

  // Regressão do timer do Modal CTA quando ativo
  useEffect(() => {
    if (!showCtaModal) return;

    if (ctaCountdown <= 0) {
      setShowCtaModal(false);
      return;
    }

    const countdownTimer = setInterval(() => {
      setCtaCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [showCtaModal, ctaCountdown]);

  // Ref para o elemento de vídeo e detecção de formato (Reels / Vertical vs Widescreen)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [isVideoVertical, setIsVideoVertical] = useState<boolean>(false);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);

  // Avançar para o Próximo Slide da TV
  const nextSlide = useCallback(() => {
    if (activePlaylist.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activePlaylist.length);
  }, [activePlaylist.length]);

  const currentItem: TvMediaItem = activePlaylist[currentIndex] || {
    id: "empty",
    title: "Sem mídias ativas na playlist da TV",
    type: "image",
    url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1920&q=80",
    durationSeconds: 8,
    active: true,
  };

  // REGRA DE ÁUDIO/VÍDEO:
  const isVideoType = currentItem.type === "video";
  const shouldMuteVideo = isVideoType && (currentItem.muteVideoKeepRadio === true);
  const shouldPauseRadio = isVideoType && (currentItem.muteVideoKeepRadio !== true);

  // CONTROLADOR DE TIMER E AUTO-AVANÇO DA PLAYLIST (IMAGENS E VÍDEOS)
  useEffect(() => {
    if (activePlaylist.length === 0) return;

    if (currentItem.type === "image") {
      // Para Imagens: usa durationSeconds (default 8s)
      const durationMs = (currentItem.durationSeconds || 8) * 1000;
      const timer = setTimeout(() => {
        nextSlide();
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      // Para Vídeos: timer de segurança (máximo 35s ou duração + 5s) para garantir que a TV nunca trave
      const maxSafetyMs = Math.max(videoDuration + 5, 20) * 1000;
      const safetyTimer = setTimeout(() => {
        nextSlide();
      }, maxSafetyMs);
      return () => clearTimeout(safetyTimer);
    }
  }, [activePlaylist.length, currentIndex, currentItem.id, currentItem.type, currentItem.durationSeconds, videoDuration, nextSlide]);

  // Pré-carregamento automático dos próximos mídias da playlist no cache da Smart TV
  useEffect(() => {
    if (activePlaylist.length <= 1) return;
    const nextIndex = (currentIndex + 1) % activePlaylist.length;
    const nextMedia = activePlaylist[nextIndex];
    if (!nextMedia || !nextMedia.url) return;

    if (nextMedia.type === "video") {
      const vidPreload = document.createElement("video");
      vidPreload.src = nextMedia.url;
      vidPreload.preload = "auto";
    } else if (nextMedia.type === "image") {
      const imgPreload = new Image();
      imgPreload.src = nextMedia.url;
    }
  }, [currentIndex, activePlaylist]);

  // Manipular Play/Autoplay do Vídeo com Fallback contra Bloqueio do Navegador
  useEffect(() => {
    if (currentItem.type === "video" && videoRef.current) {
      const vid = videoRef.current;
      vid.currentTime = 0;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("[TV Player] Autoplay com som bloqueado pelo navegador. Tentando modo mudo:", error);
          vid.muted = true;
          vid.play().catch((e) => {
            console.error("[TV Player] Erro ao reproduzir vídeo. Avançando slide:", e);
            nextSlide();
          });
        });
      }
    }
  }, [currentIndex, currentItem.id, currentItem.type, nextSlide]);

  const handleVideoEnded = () => {
    if (activePlaylist.length === 1 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      nextSlide();
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      if (videoRef.current.duration) {
        setVideoDuration(Math.ceil(videoRef.current.duration));
      }
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (height > 0 && width > 0) {
        const isVert = height > width * 1.05;
        setIsVideoVertical(isVert);
      }
    }
  };

  const currentDuration = currentItem.type === "video" ? videoDuration : (currentItem.durationSeconds || 8);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center space-y-6 select-none font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-2xl animate-pulse">
            <Tv className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        <div className="max-w-md space-y-3 relative z-10">
          <span className="text-xs font-black uppercase px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 tracking-wider">
            Sincronizando Player TV
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">{displayName}</h1>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono pt-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span>Carregando playlist & mídia indoor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (tvConfig.addonActive === false) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center space-y-6 select-none font-sans">
        <div className="w-20 h-20 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-2xl">
          <Tv className="w-10 h-10" />
        </div>

        <div className="max-w-md space-y-2">
          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            Add-on Mídia Indoor Desativado
          </span>
          <h1 className="text-3xl font-black text-white">{displayName}</h1>
          <p className="text-sm text-slate-400">
            Este recurso de TV Player não está ativo para este estabelecimento. Entre em contato com a administração da plataforma para ativar este plano.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setUserInteracted(true)}
      className="relative w-screen h-screen bg-black text-white overflow-hidden font-sans select-none flex flex-col justify-between"
    >
      
      {/* PROMPT DE DESBLOQUEIO DE ÁUDIO NO NAVEGADOR */}
      {!userInteracted && isRadioIndoorActive && (
        <button
          onClick={() => setUserInteracted(true)}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer"
        >
          <Volume2 className="w-4 h-4" /> Clique na tela para ativar o Som da Rádio Indoor & TV
        </button>
      )}

      {/* BACKGROUND STREAMER DA RÁDIO INDOOR (PERMANECE MONTADO E CACHEADO NO DOM) */}
      {isRadioIndoorActive && activeEmbedUrl && (
        <div
          className={`fixed bottom-0 right-0 z-0 transition-opacity duration-500 ${
            shouldPauseRadio ? "opacity-0 pointer-events-none w-0 h-0 overflow-hidden" : "opacity-0 pointer-events-none w-1 h-1 overflow-hidden"
          }`}
        >
          <iframe
            key={`radio_streamer_${tenantId}`}
            src={activeEmbedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      )}

      {/* EXIBIÇÃO DA MÍDIA (SLIDESHOW DE FOTOS OU VÍDEO MP4 COM ADAPTAÇÃO INTELIGENTE DE PROPORÇÃO) */}
      <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
        {currentItem.type === "video" ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            {/* SE FOR VÍDEO VERTICAL (REELS / INSTAGRAM / TIKTOK 9:16): BACKDROP AMBIENTE DESFOCADO DYNÂMICO */}
            {isVideoVertical && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <video
                  src={currentItem.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover filter blur-3xl scale-125 opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
              </div>
            )}

            {/* VÍDEO PRINCIPAL */}
            <video
              ref={videoRef}
              key={currentItem.id}
              src={currentItem.url}
              autoPlay
              playsInline
              preload="auto"
              muted={isMuted || shouldMuteVideo}
              onEnded={handleVideoEnded}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onError={nextSlide}
              className={`relative z-10 ${
                isVideoVertical
                  ? "h-full w-auto max-w-full object-contain rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10"
                  : "w-full h-full object-cover"
              }`}
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              key={currentItem.id}
              src={currentItem.url}
              alt={currentItem.title}
              onError={nextSlide}
              className="w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
          </div>
        )}
      </div>

      {/* HEADER DA TV */}
      <header className="relative z-20 p-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                {displayName}
              </h1>
              <p className="text-xs text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Mídia Indoor
              </p>
            </div>
          </div>

          {/* BADGE DA RÁDIO INDOOR SINCRONIZADA NA TV */}
          {(tvConfig.showRadioBadge !== false) && isRadioIndoorActive && !shouldPauseRadio && (
            <div className="bg-indigo-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-indigo-500/30 flex items-center gap-2.5 text-xs font-bold text-indigo-200 shadow-xl">
              <Headphones className="w-4 h-4 text-indigo-400 animate-bounce" />
              <div>
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">
                  🎵 Som Ambiente da TV ({radioConfig.provider.toUpperCase()}):
                </span>
                <span className="truncate max-w-[260px] block font-semibold text-white">
                  {radioConfig.playlistName || "Sua Playlist do Spotify/YouTube"}
                </span>
              </div>
              
              <div className="flex items-end gap-0.5 h-4 ml-1">
                <span className="w-1 bg-emerald-400 h-full animate-pulse" />
                <span className="w-1 bg-emerald-400 h-2/3 animate-pulse delay-75" />
                <span className="w-1 bg-emerald-400 h-4/5 animate-pulse delay-150" />
              </div>
            </div>
          )}
        </div>

        {/* Controles da TV */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all text-white flex items-center gap-2"
            title="Alternar Áudio"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            <span className="text-xs font-bold hidden sm:inline">
              {isMuted ? "Som Mudo" : "Som da TV Ativo"}
            </span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all text-white"
            title="Modo Tela Cheia"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* RODAPÉ DA TV */}
      <footer className="relative z-20 p-6 sm:p-8 flex flex-col md:flex-row items-end justify-between gap-6">
        {(tvConfig.showTitleOverlay !== false) && (
          <div className="max-w-2xl bg-black/70 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> DESTAQUE DA CASA
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
              {currentItem.title}
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span>Slide {currentIndex + 1} de {activePlaylist.length}</span>
              {currentItem.type === "video" ? (
                <span className="text-emerald-400 font-bold">
                  • {currentItem.muteVideoKeepRadio ? "Vídeo Mudo (Tocando Rádio Indoor)" : "Tocando Áudio Próprio do Vídeo"}
                </span>
              ) : (
                <span>• Duração: {currentItem.durationSeconds || 8}s</span>
              )}
            </p>
          </div>
        )}

        {(tvConfig.showQrOverlay !== false) && (
          <div className="bg-slate-900/90 backdrop-blur-lg border-2 border-emerald-500/50 p-5 rounded-3xl shadow-2xl flex items-center gap-5 shrink-0 max-w-md">
            <div className="bg-white p-3 rounded-2xl w-32 h-32 shrink-0 shadow-inner flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  typeof window !== "undefined" && window.location.hostname !== "localhost"
                    ? `${window.location.protocol}//${window.location.host}/portal/${tenantId}`
                    : `http://localhost:3000/portal/${tenantId}`
                )}`}
                alt="QR Code TV Wi-Fi"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
                <Wifi className="w-4 h-4" /> Wi-Fi Grátis & Pix
              </div>

              <h3 className="text-sm font-extrabold text-white leading-tight">
                Conecte seu Celular
              </h3>
              
              <p className="text-[11px] text-slate-300 leading-snug">
                Aponte a câmera para o QR Code para acessar o Wi-Fi ou pagar via Pix.
              </p>

              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-white/10">
                <span className="truncate">SSID: <strong className="text-white">{wifiSsid}</strong></span>
                {(tvConfig.showClockOverlay !== false) && (
                  <span className="font-bold text-amber-400 pl-2">{currentTime}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </footer>



      {/* POPUP MODAL DE CTA PERIÓDICO (INSTAGRAM / QR CODE) - CANTO DA TELA COMO CARD FLOATING */}
      {showCtaModal && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in select-none max-w-lg w-full">
          <div className="relative bg-slate-900/95 backdrop-blur-2xl border-2 border-pink-500/60 rounded-3xl p-5 shadow-[0_0_30px_rgba(236,72,153,0.3)] space-y-3.5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white uppercase tracking-wider shadow-md">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> RECOMENDAÇÃO DA CASA
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                Fechando em {ctaCountdown}s
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-2xl w-32 h-32 shrink-0 shadow-xl border-2 border-pink-500/30 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ctaUrl)}`}
                  alt="QR Code CTA"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-base font-black text-white leading-tight tracking-tight drop-shadow-md">
                  {ctaTitle}
                </h3>
                <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                  {ctaSubtitle}
                </p>
                <p className="text-[10px] font-mono text-pink-400 font-bold truncate pt-0.5">
                  {ctaUrl}
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-white/10 mt-1">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(ctaCountdown / ctaDurationSeconds) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
