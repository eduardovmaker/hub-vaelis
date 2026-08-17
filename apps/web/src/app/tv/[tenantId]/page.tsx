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
  Tv, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Headphones,
  Play,
  Instagram,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Radio
} from "lucide-react";

export default function SmartTvPlayer({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const derivedName = tenantId
    ? tenantId
        .replace(/^tenant_/, "")
        .replace(/_\d+$/, "")
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "Vaelis TV";

  const [isLoading, setIsLoading] = useState(true);

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
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

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
    const pollInterval = setInterval(loadTvConfig, 10000);
    return () => clearInterval(pollInterval);
  }, [tenantId]);

  const portalConfigMock = INITIAL_PORTAL_CONFIGS[tenantId];
  const displayName = tvConfig.tenantName || portalConfigMock?.tenantName || derivedName;
  const primaryColor = tvConfig.primaryColor || portalConfigMock?.primaryColor || "#2563EB";

  const activePlaylist = tvConfig.playlist ? tvConfig.playlist.filter((item) => item.active) : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Estado de visibilidade e inatividade dos controles da interface (Fade Out em 3s)
  const [isUiVisible, setIsUiVisible] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estado do Drawer Retrátil de Controles e Rádio
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Estado de Interação Inicial (Autoplay Policy unlock)
  const [userInteracted, setUserInteracted] = useState(false);

  // Detecção de movimento de cursor ou toque para restaurar os controles
  useEffect(() => {
    const handleMouseMove = () => {
      setIsUiVisible(true);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        setIsUiVisible(false);
      }, 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleMouseMove);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // Rádio Indoor
  const isRadioIndoorActive = tvConfig.addonStates?.["radio-indoor"]?.active ?? true;
  const radioConfig = tvConfig.radioIndoorConfig || {
    provider: "spotify" as const,
    playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    playlistName: "Hits Sertanejo & Pop Barbearia (Spotify)",
    spotIntervalMinutes: 15,
    syncWithSmartTv: true,
    spotMessages: [],
  };

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

  // Relógio Digital em Tempo Real
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [isVideoVertical, setIsVideoVertical] = useState<boolean>(false);

  const nextSlide = useCallback(() => {
    if (activePlaylist.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activePlaylist.length);
  }, [activePlaylist.length]);

  const prevSlide = useCallback(() => {
    if (activePlaylist.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + activePlaylist.length) % activePlaylist.length);
  }, [activePlaylist.length]);

  const currentItem: TvMediaItem = activePlaylist[currentIndex] || {
    id: "empty",
    title: "Sem mídias ativas na playlist da TV",
    type: "image",
    url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1920&q=80",
    durationSeconds: 8,
    active: true,
  };

  const isVideoType = currentItem.type === "video";
  const shouldMuteVideo = isVideoType && (currentItem.muteVideoKeepRadio === true);

  useEffect(() => {
    if (activePlaylist.length === 0) return;

    if (currentItem.type === "image") {
      const durationMs = (currentItem.durationSeconds || 8) * 1000;
      const timer = setTimeout(() => {
        nextSlide();
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      const maxSafetyMs = Math.max(videoDuration + 5, 20) * 1000;
      const safetyTimer = setTimeout(() => {
        nextSlide();
      }, maxSafetyMs);
      return () => clearTimeout(safetyTimer);
    }
  }, [activePlaylist.length, currentIndex, currentItem.id, currentItem.type, currentItem.durationSeconds, videoDuration, nextSlide]);

  useEffect(() => {
    if (currentItem.type === "video" && videoRef.current) {
      const vid = videoRef.current;
      vid.currentTime = 0;
      if (userInteracted) {
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("[TV Player] Autoplay bloqueado:", error);
            vid.muted = true;
            vid.play().catch(() => nextSlide());
          });
        }
      }
    }
  }, [currentIndex, currentItem.id, currentItem.type, userInteracted, nextSlide]);

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
        setIsVideoVertical(height > width * 1.1);
      }
    }
  };

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
        <div className="w-20 h-20 rounded-3xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-2xl animate-pulse">
          <Tv className="w-10 h-10 animate-bounce" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">{displayName}</h1>
        <p className="text-xs text-slate-400 font-mono">Carregando Mídia Indoor...</p>
      </div>
    );
  }

  // Desbloqueio do Contexto de Áudio e Autoplay do Navegador
  const handleUnlockAudio = () => {
    setUserInteracted(true);

    // Resumir AudioContext do navegador se suspenso
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
      }
    } catch (e) {}

    // Iniciar vídeo se mídia atual for vídeo
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden font-sans select-none flex flex-col justify-between">
      
      {/* 1. OVERLAY DE INTERAÇÃO INICIAL (DESTRAVA O AUTOPLAY DE ÁUDIO NO NAVEGADOR) */}
      {!userInteracted && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6 animate-scale-up">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-0.5 mx-auto shadow-[0_0_50px_rgba(236,72,153,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Tv className="w-12 h-12 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                Digital Signage & Rádio Indoor
              </span>
              <h2 className="text-2xl font-black text-white">{displayName}</h2>
              <p className="text-xs text-slate-400">
                Clique no botão abaixo para liberar o som ambiente da Rádio Indoor (Spotify) e iniciar a transmissão da TV sem interrupções.
              </p>
            </div>

            <button
              onClick={handleUnlockAudio}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-black text-sm shadow-2xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" /> Iniciar Mídia Indoor
            </button>
          </div>
        </div>
      )}

      {/* 2. REPRODUÇÃO EM BACKGROUND DA RÁDIO INDOOR (SPOTIFY WEB CONTROLLER / EMBED FLUIDO SEM INTERRUPÇÃO) */}
      {isRadioIndoorActive && activeEmbedUrl && (
        <div 
          key="static_radio_audio_container"
          className="fixed -bottom-96 -left-96 w-1 h-1 opacity-0 pointer-events-none overflow-hidden z-0"
        >
          <iframe
            id="spotify_radio_iframe_player"
            key={`radio_streamer_static_${tenantId}`}
            src={
              activeEmbedUrl.includes("?")
                ? `${activeEmbedUrl}&autoplay=1`
                : `${activeEmbedUrl}?autoplay=1`
            }
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      )}

      {/* 3. MÍDIA PRINCIPAL (FOTO OU VÍDEO MP4 COM SUPORTE INTELIGENTE A REELS 9:16 VS FULLSCREEN 16:9) */}
      <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
        {currentItem.type === "video" ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            {/* SE FOR REELS VERTICAL (9:16): AMBIENTE RADIAL GLOW LEVE CONFORME IMAGE_EBBC3A.JPG */}
            {isVideoVertical && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2)_0%,rgba(15,23,42,0.98)_75%)]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
              </div>
            )}

            {/* VÍDEO EXIBIDO NA TV */}
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
                  ? "h-[92vh] w-auto max-w-full object-contain rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.95)] border border-white/10"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
          </div>
        )}
      </div>

      {/* 4. HEADER MINIMALISTA COM FADE-OUT APÓS 3 SEGUNDOS DE INATIVIDADE */}
      <header
        className={`relative z-20 p-6 flex items-center justify-between transition-opacity duration-700 ${
          isUiVisible || isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white leading-none">
                {displayName}
              </h1>
              <p className="text-[10px] text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Mídia Indoor
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES E BOTÃO PARA ABRIR O DRAWER LATERAL */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all text-white flex items-center gap-1.5"
            title="Alternar Áudio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all text-white"
            title="Modo Tela Cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            title="Abrir Rádio & Controles"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Controles & Rádio</span>
          </button>
        </div>
      </header>

      {/* 5. FOOTER MINIMALISTA: TÍTULO DA MÍDIA E CTA DO INSTAGRAM NO CANTO INFERIOR DIREITO */}
      <footer
        className={`relative z-20 p-6 flex flex-col md:flex-row items-end justify-between gap-6 transition-opacity duration-700 ${
          isUiVisible || isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* TÍTULO E SLIDE ATUAL DA MÍDIA */}
        {tvConfig.showTitleOverlay !== false && (
          <div className="max-w-xl bg-black/50 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl space-y-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> DESTAQUE DA CASA
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
              {currentItem.title}
            </h2>
            <p className="text-[11px] text-slate-300 flex items-center gap-2">
              <span>Slide {currentIndex + 1} de {activePlaylist.length}</span>
              {currentItem.type === "video" ? (
                <span className="text-emerald-400 font-bold">
                  • {currentItem.muteVideoKeepRadio ? "Vídeo Mudo (Tocando Rádio)" : "Tocando Áudio do Vídeo"}
                </span>
              ) : (
                <span>• Duração: {currentItem.durationSeconds || 8}s</span>
              )}
            </p>
          </div>
        )}

        {/* REPLICANDO REQUISITO DO CLIENTE: CTA DE INSTAGRAM SUBISTITUINDO O QR CODE DE WIFI/PIX */}
        <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-xs shrink-0">
          <div className="bg-white p-2 rounded-xl w-20 h-20 shrink-0 shadow-inner flex items-center justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                tvConfig.customCtaUrl || `https://instagram.com`
              )}`}
              alt="QR Code Instagram"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-black text-pink-400 uppercase tracking-wider">
              <Instagram className="w-3.5 h-3.5 text-pink-500" /> Siga no Instagram
            </div>

            <h3 className="text-xs font-extrabold text-white truncate leading-tight">
              {tvConfig.customCtaTitle || `@${displayName.toLowerCase().replace(/\s+/g, "_")}`}
            </h3>
            
            <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">
              Aponte a câmera do celular para conferir novidades e fotos da loja.
            </p>

            {currentTime && (
              <p className="text-[10px] font-mono font-bold text-amber-400 pt-0.5">{currentTime}</p>
            )}
          </div>
        </div>
      </footer>

      {/* 6. DRAWER LATERAL RETRÁTIL PARA RÁDIO INDOOR & NAVEGAÇÃO DA TV */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 h-full p-6 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Controles da Mídia & Rádio</h3>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SEÇÃO DA RÁDIO INDOOR (SPOTIFY & YOUTUBE) */}
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-indigo-400" /> Rádio Indoor ({provider.toUpperCase()})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Ao Vivo
                  </span>
                </div>

                <p className="text-xs text-white font-extrabold truncate">
                  {radioConfig.playlistName || "Hits Barbearia / Loja"}
                </p>

                <div className="pt-2 border-t border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
                  <p>• Música contínua em segundo plano.</p>
                  <p>• Vinhetas comerciais a cada 15 min.</p>
                </div>
              </div>

              {/* CONTROLES DA PLAYLIST DA TV */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Navegação Manual de Mídias
                </h4>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={prevSlide}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>

                  <button
                    onClick={nextSlide}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md"
                  >
                    Próximo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-white/10">
                  <p className="font-bold text-white">Mídia Atual:</p>
                  <p className="truncate text-slate-300">{currentItem.title}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
              >
                Fechar Menu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
