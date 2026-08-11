"use client";

import { use, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INITIAL_PORTAL_CONFIGS, PortalBanner, PixPlan } from "@/mocks/portal";
import { 
  INITIAL_TV_CONFIGS, 
  TvMediaItem, 
  TenantTvConfig, 
  PlanCycle, 
  AddonModuleId,
  RadioIndoorConfig,
  GoogleReviewsConfig,
  WhatsappBotConfig,
  RoletaSorteConfig,
  WebGuardConfig,
  parseSpotifyEmbedUrl,
  parseYouTubeEmbedUrl
} from "@/mocks/tv";
import { BannerCarousel } from "@/components/BannerCarousel";
import { MobileDeviceSimulator } from "@/components/MobileDeviceSimulator";
import { 
  Store, 
  Wifi, 
  QrCode, 
  Image as ImageIcon, 
  LogOut, 
  DollarSign, 
  Users, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X,
  Smartphone,
  Eye,
  UtensilsCrossed,
  Scissors,
  ShoppingBag,
  Link as LinkIcon,
  Save,
  Check,
  Globe,
  Tv,
  ExternalLink,
  Play,
  Clock,
  Video,
  AlertCircle,
  LayoutDashboard,
  HardDrive,
  Activity,
  Search,
  RefreshCw,
  Zap,
  Radio,
  Sliders,
  Layers,
  WifiOff,
  ShoppingCart,
  CreditCard,
  Calendar,
  ShieldCheck,
  Copy,
  ArrowRight,
  MessageSquare,
  Building,
  Star,
  Volume2,
  Music,
  Dices,
  CheckSquare,
  VolumeX,
  SlidersHorizontal,
  Lock,
  Unlock,
  Download,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Settings,
  Link as LinkSymbol,
  PlayCircle,
  Gift,
  Trophy,
  HeartHandshake,
  Package,
  Tag,
  UploadCloud,
  FileVideo
} from "lucide-react";

interface ConnectedDevice {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  signalRssi: number;
  accessType: "Pix Pago" | "Acesso Grátis (30m)";
  downloadSpeed: string;
  bytesUsed: string;
  connectedTime: string;
  status: "active" | "idle";
}

const INITIAL_CONNECTED_DEVICES: ConnectedDevice[] = [];

interface CapturedLead {
  id: string;
  name: string;
  whatsapp: string;
  connectedAt: string;
  birthdate: string;
  optIn: boolean;
}

const INITIAL_CAPTURED_LEADS: CapturedLead[] = [];

const ADDONS_CATALOG = [
  {
    id: "midia-indoor" as AddonModuleId,
    title: "Add-on Mídia Indoor (TV Player Digital Signage)",
    description: "Transmita fotos promocionais e vídeos MP4 em Smart TV ou Firestick com QR Code Pix na tela.",
    priceMensal: 89,
    priceTrimestral: 239,
    priceAnual: 790,
    icon: Tv,
    color: "purple",
    badge: "Digital Signage",
  },
  {
    id: "radio-indoor" as AddonModuleId,
    title: "🎵 Add-on Rádio Indoor Comercial (Spotify & YouTube)",
    description: "Música ambiente sem anúncios integrada ao Spotify & YouTube Music + inserção de vinhetas em áudio da loja.",
    priceMensal: 79,
    priceTrimestral: 209,
    priceAnual: 690,
    icon: Headphones,
    color: "indigo",
    badge: "Som Ambiente",
  },
  {
    id: "google-reviews" as AddonModuleId,
    title: "⭐ Add-on Reputação Automática no Google Maps",
    description: "Pesquisa NPS de 1 a 5★ no Wi-Fi. Notas 4-5★ vão pro Google Meu Negócio; 1-3★ vão direto pro WhatsApp do gerente.",
    priceMensal: 49,
    priceTrimestral: 129,
    priceAnual: 440,
    icon: Star,
    color: "amber",
    badge: "SEO & Reputação",
  },
  {
    id: "whatsapp-bot" as AddonModuleId,
    title: "📱 Add-on WhatsApp Bot & Captura de Leads",
    description: "Autenticação Wi-Fi por WhatsApp com envio de OTP SMS, disparo de cupons pós-visita e aniversariantes.",
    priceMensal: 69,
    priceTrimestral: 189,
    priceAnual: 620,
    icon: MessageSquare,
    color: "emerald",
    badge: "CRM & Marketing",
  },
  {
    id: "roleta-da-sorte" as AddonModuleId,
    title: "🎯 Add-on Roleta da Sorte Digital (Gamificação)",
    description: "Roleta interativa na tela do smartphone do cliente ao conectar, sorteando prêmios e pratos cortesia.",
    priceMensal: 39,
    priceTrimestral: 99,
    priceAnual: 350,
    icon: Dices,
    color: "rose",
    badge: "Engajamento",
  },
  {
    id: "web-guard" as AddonModuleId,
    title: "🛡️ Add-on Filtro de Conteúdo & Guardião MikroTik",
    description: "Bloqueio de sites adultos, apostas e torrents na rede + limite dinâmico de velocidade por dispositivo.",
    priceMensal: 49,
    priceTrimestral: 129,
    priceAnual: 440,
    icon: ShieldCheck,
    color: "blue",
    badge: "Segurança Wi-Fi",
  },
  {
    id: "multi-unidades" as AddonModuleId,
    title: "🏢 Add-on Multi-Unidades / Franquias & Analytics",
    description: "Gestão unificada de múltiplas filiais, comparativo de acessos entre lojas e mapas de calor de pico.",
    priceMensal: 119,
    priceTrimestral: 319,
    priceAnual: 990,
    icon: Building,
    color: "cyan",
    badge: "Franquias & Redes",
  },
  {
    id: "loja-produtos" as AddonModuleId,
    title: "🛍️ Add-on Loja de Produtos & Estoque (Vendas via Pix)",
    description: "Venda pomadas, bebidas e produtos da barbearia/loja com controle de estoque e pagamento Pix automático.",
    priceMensal: 59,
    priceTrimestral: 159,
    priceAnual: 520,
    icon: ShoppingBag,
    color: "emerald",
    badge: "Vendas & Estoque",
  },
];

type TenantTabType = 
  | "dashboard" 
  | "captive-portal"
  | "carrossel" 
  | "servicos"
  | "midia-indoor" 
  | "radio-indoor" 
  | "google-reviews" 
  | "whatsapp-bot" 
  | "roleta-da-sorte" 
  | "loja-produtos"
  | "web-guard" 
  | "multi-unidades" 
  | "wifi-vip";

export default function TenantDashboard({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId || "tenant_bar_01";
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TenantTabType>("dashboard");

  // Nome legível derivado do ID caso ainda não tenha carregado do banco
  const derivedTenantName = tenantId
    .replace(/^tenant_/, "")
    .replace(/_\d+$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const [displayTenantName, setDisplayTenantName] = useState(
    (user?.tenantId === tenantId && user?.tenantName) ? user.tenantName : derivedTenantName
  );
  const [displayWifiSsid, setDisplayWifiSsid] = useState(`${derivedTenantName}_WiFi_Gratis`);

  const initialConfig = INITIAL_PORTAL_CONFIGS[tenantId] || {
    tenantId,
    tenantName: derivedTenantName,
    tenantCategory: "FOOD",
    wifiSsid: `${derivedTenantName}_WiFi_Gratis`,
    primaryColor: "#2563EB",
    banners: [],
    pixPlans: [
      { id: "p_1", title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi • 20 Mbps", price: 5.00, speedLimit: "20 Mbps", recommended: true },
      { id: "p_2", title: "Passaporte Noite Toda (6 Horas)", durationText: "6 Horas de Alta Velocidade • 50 Mbps", price: 10.00, speedLimit: "50 Mbps", recommended: false },
    ],
    freeAccessEnabled: true,
    freeAccessDurationMinutes: 30,
    adWatchSeconds: 15,
    digitalMenuEnabled: true,
    digitalMenuUrl: "",
    digitalMenuTitle: "Cardápio & Serviços",
    digitalMenuButtonText: "Ver Cardápio & Serviços",
    digitalMenuIcon: "utensils",
    autoRedirectToMenu: false,
  };
  
  const [tvConfig, setTvConfig] = useState<TenantTvConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("captive_hub_tv_configs");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed[tenantId]) return parsed[tenantId];
        } catch (e) {}
      }
    }
    return INITIAL_TV_CONFIGS[tenantId] || {
      tenantId,
      tenantName: derivedTenantName,
      pairingCode: `TV-${Math.floor(1000 + Math.random() * 9000)}`,
      addonActive: false,
      showQrOverlay: true,
      showClockOverlay: true,
      showRadioBadge: true,
      showTitleOverlay: true,
      showHeaderLogo: true,
      planCycle: "MENSAL",
      paymentStatus: "PAID",
      playlist: [],
      addonStates: {
        "captive-portal": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
      },
    };
  });

  useEffect(() => {
    async function loadTenantConfigs() {
      try {
        const [tvRes, portalRes] = await Promise.all([
          fetch(`/api/tv/${tenantId}`),
          fetch(`/api/portal/${tenantId}`),
        ]);

        const tvData = await tvRes.json();
        if (tvData.success && tvData.tvConfig) {
          setTvConfig(tvData.tvConfig);
          if (tvData.tvConfig.tenantName) {
            setDisplayTenantName(tvData.tvConfig.tenantName);
          }
          if (tvData.tvConfig.playlist) {
            setTvPlaylist(tvData.tvConfig.playlist);
          }
          if (tvData.tvConfig.radioIndoorConfig) {
            setRadioConfig(tvData.tvConfig.radioIndoorConfig);
          }

          if (typeof window !== "undefined") {
            const stored = localStorage.getItem("captive_hub_tv_configs");
            const currentConfigs = stored ? JSON.parse(stored) : {};
            currentConfigs[tenantId] = tvData.tvConfig;
            localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
          }
        }

        const portalData = await portalRes.json();
        if (portalData.success && portalData.portalConfig) {
          const pc = portalData.portalConfig;
          if (pc.tenantName) setDisplayTenantName(pc.tenantName);
          if (pc.wifiSsid) setDisplayWifiSsid(pc.wifiSsid);

          setBanners(pc.banners || []);
          setPixPlansList(pc.pixPlans || []);
          setFreeAccessEnabled(pc.freeAccessEnabled ?? true);
          setFreeAccessDurationMinutes(pc.freeAccessDurationMinutes ?? 30);
          setAdWatchSeconds(pc.adWatchSeconds ?? 15);
          setDigitalMenuEnabled(pc.digitalMenuEnabled ?? true);
          setDigitalMenuUrl(pc.digitalMenuUrl ?? "");
          setDigitalMenuTitle(pc.digitalMenuTitle ?? "Cardápio Digital");
          setDigitalMenuButtonText(pc.digitalMenuButtonText ?? "Ver Cardápio");
          setDigitalMenuIcon(pc.digitalMenuIcon || "utensils");
          setAutoRedirectToMenu(pc.autoRedirectToMenu ?? false);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do tenant via API:", err);
      }
    }

    loadTenantConfigs();
  }, [tenantId]);

  // Estado dos Planos PIX & Banda do Captive Portal
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToastNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [pixPlansList, setPixPlansList] = useState<PixPlan[]>(initialConfig.pixPlans || []);
  const [freeAccessEnabled, setFreeAccessEnabled] = useState(initialConfig.freeAccessEnabled ?? true);
  const [freeAccessDurationMinutes, setFreeAccessDurationMinutes] = useState(initialConfig.freeAccessDurationMinutes ?? 30);
  const [adWatchSeconds, setAdWatchSeconds] = useState(initialConfig.adWatchSeconds ?? 15);

  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanDurationText, setNewPlanDurationText] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState(5.0);
  const [newPlanSpeedLimit, setNewPlanSpeedLimit] = useState("50 Mbps");
  const [newPlanRecommended, setNewPlanRecommended] = useState(false);

  const handleSaveCaptivePortalSettings = async () => {
    try {
      const res = await fetch(`/api/portal/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeAccessEnabled,
          freeAccessDurationMinutes,
          adWatchSeconds,
          digitalMenuEnabled,
          digitalMenuUrl,
          digitalMenuTitle,
          digitalMenuButtonText,
          digitalMenuIcon,
          autoRedirectToMenu,
          pixPlans: pixPlansList,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToastNotification("Configurações do Captive Portal e Planos de Banda salvos!");
      }
    } catch (err) {
      console.error("Erro ao salvar captive portal:", err);
    }
  };

  const handleAddPixPlan = () => {
    if (!newPlanTitle) return;
    const newPlan: PixPlan = {
      id: `p_${Date.now()}`,
      title: newPlanTitle,
      durationText: newPlanDurationText || "Acesso Wi-Fi",
      price: Number(newPlanPrice),
      speedLimit: newPlanSpeedLimit || "50 Mbps",
      recommended: newPlanRecommended,
    };
    const updated = [...pixPlansList, newPlan];
    setPixPlansList(updated);
    setShowAddPlanModal(false);
    setNewPlanTitle("");
    setNewPlanDurationText("");
    setNewPlanPrice(5.0);
    showToastNotification("Novo Plano de Wi-Fi adicionado!");
  };

  const handleDeletePixPlan = (planId: string) => {
    const updated = pixPlansList.filter((p) => p.id !== planId);
    setPixPlansList(updated);
    showToastNotification("Plano de Wi-Fi removido!");
  };

  const handleUpdatePlanPriceAndSpeed = (planId: string, newPrice: number, newSpeed: string) => {
    const updated = pixPlansList.map((p) =>
      p.id === planId ? { ...p, price: newPrice, speedLimit: newSpeed } : p
    );
    setPixPlansList(updated);
  };

  // Estado dos Banners do Portal
  const [banners, setBanners] = useState<PortalBanner[]>(initialConfig.banners);
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Estado do Link Principal / Cardápio / Serviços
  const [digitalMenuEnabled, setDigitalMenuEnabled] = useState(initialConfig.digitalMenuEnabled);
  const [digitalMenuUrl, setDigitalMenuUrl] = useState(initialConfig.digitalMenuUrl);
  const [digitalMenuTitle, setDigitalMenuTitle] = useState(initialConfig.digitalMenuTitle);
  const [digitalMenuButtonText, setDigitalMenuButtonText] = useState(initialConfig.digitalMenuButtonText);
  const [digitalMenuIcon, setDigitalMenuIcon] = useState(initialConfig.digitalMenuIcon || "utensils");
  const [autoRedirectToMenu, setAutoRedirectToMenu] = useState(initialConfig.autoRedirectToMenu);
  const [menuSaved, setMenuSaved] = useState(false);

  // Estado do Add-on Mídia Indoor (TV Player)
  const [tvPlaylist, setTvPlaylist] = useState<TvMediaItem[]>(tvConfig.playlist || []);
  const [showQrOverlay, setShowQrOverlay] = useState(tvConfig.showQrOverlay);
  const [showClockOverlay, setShowClockOverlay] = useState(tvConfig.showClockOverlay);
  const [showRadioBadge, setShowRadioBadge] = useState(tvConfig.showRadioBadge ?? true);
  const [showTitleOverlay, setShowTitleOverlay] = useState(tvConfig.showTitleOverlay ?? true);
  
  // Estado do Popup de CTA / QR Code Periódico na TV (Instagram / Links)
  const [customCtaEnabled, setCustomCtaEnabled] = useState(tvConfig.customCtaEnabled ?? false);
  const [customCtaTitle, setCustomCtaTitle] = useState(tvConfig.customCtaTitle || "Siga nosso Instagram!");
  const [customCtaSubtitle, setCustomCtaSubtitle] = useState(tvConfig.customCtaSubtitle || "Aponte a câmera do celular para conferir novidades e promoções.");
  const [customCtaUrl, setCustomCtaUrl] = useState(tvConfig.customCtaUrl || "https://instagram.com");
  const [customCtaIntervalMinutes, setCustomCtaIntervalMinutes] = useState(tvConfig.customCtaIntervalMinutes || 5);
  const [customCtaDurationSeconds, setCustomCtaDurationSeconds] = useState(tvConfig.customCtaDurationSeconds || 15);
  
  const [isSavingTvOverlays, setIsSavingTvOverlays] = useState(false);
  const [showAddTvMediaModal, setShowAddTvMediaModal] = useState(false);

  // Ref para rolagem suave da Navbar com Loop Infinito
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollNav = (direction: "left" | "right") => {
    if (!navContainerRef.current) return;
    const container = navContainerRef.current;
    const scrollAmount = 280;

    if (direction === "right") {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScrollLeft - 10) {
        // Loop Infinito: Volta para o início
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    } else {
      if (container.scrollLeft <= 10) {
        // Loop Infinito: Vai para o final
        container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    }
  };
  
  // Novo item de Mídia da TV (com controle exato do toggle: muteVideoKeepRadio)
  const [newTvMediaType, setNewTvMediaType] = useState<"image" | "video">("image");
  const [newTvMediaTitle, setNewTvMediaTitle] = useState("");
  const [newTvMediaUrl, setNewTvMediaUrl] = useState("");
  const [newTvMediaDuration, setNewTvMediaDuration] = useState(10);
  const [newTvMediaMuteVideoKeepRadio, setNewTvMediaMuteVideoKeepRadio] = useState(false);

  // Estado dos Dispositivos Conectados no Wi-Fi
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>(INITIAL_CONNECTED_DEVICES);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("");
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Estado do Modal Simulador da Visão do Cliente Mobile
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  // Estado de Checkout Asaas
  const [targetAddonId, setTargetAddonId] = useState<AddonModuleId>("midia-indoor");
  const [selectedCycle, setSelectedCycle] = useState<PlanCycle>("MENSAL");
  const [showAsaasCheckoutModal, setShowAsaasCheckoutModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessingAsaas, setIsProcessingAsaas] = useState(false);

  // Estado de Upload de Arquivos para o Cloudflare R2
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);

  const handleFileUpload = async (file: File, target: "tvMedia" | "banner") => {
    if (!file) return;
    setIsUploadingFile(true);
    setUploadProgressText(`Gerando link direto de gravação no Cloudflare R2...`);

    try {
      const folder = target === "tvMedia" ? "tv-playlist" : "banners";
      
      // 1. Solicita URL de upload presignada (Evita HTTP 413 Vercel Payload Limit)
      const presignedRes = await fetch(
        `/api/upload?fileName=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type || "video/mp4")}&folder=${folder}`
      );
      const presignedData = await presignedRes.json();

      let finalUrl = "";

      if (presignedData.success && presignedData.uploadUrl) {
        setUploadProgressText(`Enviando ${file.name} em alta velocidade para o Cloudflare R2...`);
        
        // 2. Transmissão direta Navegador -> Cloudflare R2 via HTTP PUT
        const uploadRes = await fetch(presignedData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "video/mp4",
          },
          body: file,
        });

        if (uploadRes.ok) {
          finalUrl = presignedData.publicUrl;
        }
      }

      // Fallback para POST se a URL presignada não estiver disponível
      if (!finalUrl) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.url) {
          finalUrl = data.url;
        } else {
          showToastNotification(`❌ Erro no upload: ${data.error || "Não foi possível enviar o arquivo."}`);
          return;
        }
      }

      if (finalUrl) {
        if (target === "tvMedia") {
          setNewTvMediaUrl(finalUrl);
          if (!newTvMediaTitle) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            setNewTvMediaTitle(baseName);
          }
          if (file.type.startsWith("video/")) {
            setNewTvMediaType("video");
          } else if (file.type.startsWith("image/")) {
            setNewTvMediaType("image");
          }
        } else {
          setNewImageUrl(finalUrl);
          if (!newTitle) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            setNewTitle(baseName);
          }
        }
        showToastNotification("✅ Arquivo gravado com sucesso no Cloudflare R2!");
      }
    } catch (err) {
      console.error("Erro no upload R2:", err);
      showToastNotification("❌ Erro ao enviar arquivo para o Cloudflare R2.");
    } finally {
      setIsUploadingFile(false);
      setUploadProgressText(null);
    }
  };

  // Configuração Customizada do Rádio Indoor
  const [radioConfig, setRadioConfig] = useState<RadioIndoorConfig>(
    tvConfig.radioIndoorConfig || {
      provider: "spotify",
      playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      playlistName: "Hits da Boêmia & Sertanejo (Sua Playlist Spotify)",
      spotIntervalMinutes: 15,
      spotMessages: [
        "📢 Chopp em Dobro no Bar até às 21h! Peça pelo cardápio digital.",
        "📸 Marque a gente no Instagram @vilaboemiabar para ganhar um shot!",
      ],
    }
  );

  const [customPlaylistInput, setCustomPlaylistInput] = useState(radioConfig.playlistUrl);
  const [newSpotMessageInput, setNewSpotMessageInput] = useState("");
  const [isPlayingAudioSpot, setIsPlayingAudioSpot] = useState(false);

  // Reputação Google State
  const [googleUrlInput, setGoogleUrlInput] = useState(tvConfig.googleReviewsConfig?.googleMapsUrl || "https://maps.google.com/?cid=123456789");
  const [googleMinRating, setGoogleMinRating] = useState(tvConfig.googleReviewsConfig?.minRatingForGoogle || 4);
  const [managerWhatsapp, setManagerWhatsapp] = useState(tvConfig.googleReviewsConfig?.managerWhatsapp || "5511999887766");

  // Roleta Sorte State
  const [roletaPrizes, setRoletaPrizes] = useState(tvConfig.roletaSorteConfig?.prizes || [
    { id: "rz1", name: "10% de Desconto na Conta", chancePercent: 30 },
    { id: "rz2", name: "Shot de Cortesia no Bar", chancePercent: 20 },
    { id: "rz3", name: "Batata Rústica Grátis", chancePercent: 10 },
    { id: "rz4", name: "Tente Novamente", chancePercent: 40 },
  ]);
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizeChance, setNewPrizeChance] = useState(15);
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

  // Estados Avançados do Bot WhatsApp & CRM de Leads
  const [botWelcomeMessage, setBotWelcomeMessage] = useState(
    "Seja bem-vindo ao {estabelecimento}! Seu Wi-Fi está liberado. Acesse nosso cardápio e novidades pelo link!"
  );
  const [botReturnReminderDays, setBotReturnReminderDays] = useState(20);
  const [botReturnMessage, setBotReturnMessage] = useState(
    "Fala {nome}! Já faz {dias} dias da sua última visita ao {estabelecimento}. Bora alinhar o visual essa semana?"
  );
  const [botBirthdayMessage, setBotBirthdayMessage] = useState(
    "Parabéns {nome}! O {estabelecimento} te deseja um feliz aniversário! Passe aqui essa semana para resgatar seu presente VIP."
  );
  const [capturedLeadsList, setCapturedLeadsList] = useState<CapturedLead[]>(INITIAL_CAPTURED_LEADS);
  const [newLeadNameInput, setNewLeadNameInput] = useState("");
  const [newLeadPhoneInput, setNewLeadPhoneInput] = useState("");
  const [newLeadBirthdateInput, setNewLeadBirthdateInput] = useState("");
  const [copiedCheckinUrl, setCopiedCheckinUrl] = useState(false);

  // Histórico de Cupons e Ganhadores da Roleta
  const [roletaWinnersList, setRoletaWinnersList] = useState<any[]>([]);
  const [copiedRoletaUrl, setCopiedRoletaUrl] = useState(false);

  // Estados da Loja de Produtos & Controle de Estoque
  const [shopProductsList, setShopProductsList] = useState<any[]>([]);

  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Cabelo & Barba");
  const [newProdPrice, setNewProdPrice] = useState(35.00);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdImageUrl, setNewProdImageUrl] = useState("");

  const [productSalesList, setProductSalesList] = useState<any[]>([]);

  // Web Guard State
  const [blockAdult, setBlockAdult] = useState(tvConfig.webGuardConfig?.blockAdultContent ?? true);
  const [blockTorrents, setBlockTorrents] = useState(tvConfig.webGuardConfig?.blockTorrents ?? true);
  const [blockGambling, setBlockGambling] = useState(tvConfig.webGuardConfig?.blockGambling ?? true);
  const [speedLimit, setSpeedLimit] = useState(tvConfig.webGuardConfig?.userSpeedLimitMbps ?? 10);

  const showNotification = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3500);
  };

  const handleDisconnectDevice = (id: string, hostname: string) => {
    setConnectedDevices((prev) => prev.filter((d) => d.id !== id));
    showNotification(`Dispositivo "${hostname}" desconectado do Wi-Fi.`);
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newImageUrl) return;

    const newBanner: PortalBanner = {
      id: `b_${Date.now()}`,
      title: newTitle,
      subtitle: newSubtitle || undefined,
      imageUrl: newImageUrl,
      active: true,
      order: banners.length + 1,
    };

    setBanners((prev) => [...prev, newBanner]);
    setNewTitle("");
    setNewSubtitle("");
    setNewImageUrl("");
    setShowAddBannerModal(false);
    showNotification("Novo banner adicionado ao carrossel com sucesso!");
  };

  const handleDeleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    showNotification("Banner removido do carrossel.");
  };

  const handleSaveMenuConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setMenuSaved(true);
    setTimeout(() => setMenuSaved(false), 3000);
    showNotification("Configurações do link salvas com sucesso!");
  };

  const handleAddTvMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTvMediaTitle || !newTvMediaTitle.trim()) {
      showNotification("⚠️ Digite um título para a mídia antes de salvar.");
      return;
    }
    if (!newTvMediaUrl || !newTvMediaUrl.trim()) {
      showNotification("⚠️ Busque um arquivo no computador ou informe a URL da mídia.");
      return;
    }

    const newMedia: TvMediaItem = {
      id: `tv_${Date.now()}`,
      title: newTvMediaTitle.trim(),
      type: newTvMediaType,
      url: newTvMediaUrl.trim(),
      durationSeconds: newTvMediaType === "image" ? Number(newTvMediaDuration) || 10 : undefined,
      muteVideoKeepRadio: newTvMediaType === "video" ? newTvMediaMuteVideoKeepRadio : undefined,
      active: true,
    };

    const updatedPlaylist = [...tvPlaylist, newMedia];
    setTvPlaylist(updatedPlaylist);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("captive_hub_tv_configs");
      const currentConfigs = stored ? JSON.parse(stored) : INITIAL_TV_CONFIGS;
      currentConfigs[tenantId] = {
        ...currentConfigs[tenantId],
        playlist: updatedPlaylist,
      };
      localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
    }

    // Persiste permanentemente no banco de dados Firestore
    try {
      await fetch(`/api/tv/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist: updatedPlaylist }),
      });
    } catch (err) {
      console.error("Erro ao salvar mídia na TV:", err);
    }

    setNewTvMediaTitle("");
    setNewTvMediaUrl("");
    setNewTvMediaDuration(10);
    setNewTvMediaMuteVideoKeepRadio(false);
    setShowAddTvMediaModal(false);
    showNotification("✨ Nova mídia salva na TV e sincronizada no banco!");
  };

  const handleSaveTvOverlaySettings = async () => {
    setIsSavingTvOverlays(true);
    try {
      const updatedConfig: TenantTvConfig = {
        ...tvConfig,
        showQrOverlay,
        showClockOverlay,
        showRadioBadge,
        showTitleOverlay,
        customCtaEnabled,
        customCtaTitle,
        customCtaSubtitle,
        customCtaUrl,
        customCtaIntervalMinutes,
        customCtaDurationSeconds,
      };

      setTvConfig(updatedConfig);

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("captive_hub_tv_configs");
        const currentConfigs = stored ? JSON.parse(stored) : INITIAL_TV_CONFIGS;
        currentConfigs[tenantId] = updatedConfig;
        localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
        window.dispatchEvent(new Event("storage"));
      }

      await fetch(`/api/tv/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showQrOverlay,
          showClockOverlay,
          showRadioBadge,
          showTitleOverlay,
          customCtaEnabled,
          customCtaTitle,
          customCtaSubtitle,
          customCtaUrl,
          customCtaIntervalMinutes,
          customCtaDurationSeconds,
        }),
      });

      showNotification("✨ Layout e Popup CTA da TV salvos com sucesso!");
    } catch (err) {
      showNotification("Erro ao salvar configurações da TV.");
    } finally {
      setIsSavingTvOverlays(false);
    }
  };

  const handleDeleteTvMedia = async (id: string) => {
    const updatedPlaylist = tvPlaylist.filter((item) => item.id !== id);
    setTvPlaylist(updatedPlaylist);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("captive_hub_tv_configs");
      const currentConfigs = stored ? JSON.parse(stored) : INITIAL_TV_CONFIGS;
      currentConfigs[tenantId] = {
        ...currentConfigs[tenantId],
        playlist: updatedPlaylist,
      };
      localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
    }

    try {
      await fetch(`/api/tv/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist: updatedPlaylist }),
      });
    } catch (err) {
      console.error("Erro ao excluir mídia da TV:", err);
    }
    showNotification("Mídia removida da TV e atualizada no banco.");
  };

  const openCheckoutForAddon = (addonId: AddonModuleId) => {
    setTargetAddonId(addonId);
    setShowAsaasCheckoutModal(true);
  };

  const handleConfirmAsaasPayment = async () => {
    setIsProcessingAsaas(true);
    try {
      const targetCatalogItem = ADDONS_CATALOG.find((a) => a.id === targetAddonId);
      const price = selectedCycle === "MENSAL"
        ? targetCatalogItem?.priceMensal || 89
        : selectedCycle === "TRIMESTRAL"
        ? targetCatalogItem?.priceTrimestral || 239
        : targetCatalogItem?.priceAnual || 790;

      const res = await fetch("/api/webhooks/asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          tenantId,
          addonId: targetAddonId,
          cycle: selectedCycle,
          payment: {
            id: `pay_asaas_${Date.now()}`,
            value: price,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.config) {
        const updatedAddonStates = {
          ...(tvConfig.addonStates || {}),
          [targetAddonId]: {
            active: true,
            planCycle: selectedCycle,
            paymentStatus: "PAID" as const,
            subscriptionExpiresAt: data.config.subscriptionExpiresAt,
            asaasPaymentId: data.config.asaasPaymentId,
          },
        };

        const updatedConfig: TenantTvConfig = {
          ...tvConfig,
          addonActive: targetAddonId === "midia-indoor" ? true : tvConfig.addonActive,
          addonStates: updatedAddonStates as any,
        };

        setTvConfig(updatedConfig);

        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("captive_hub_tv_configs");
          const currentConfigs = stored ? JSON.parse(stored) : INITIAL_TV_CONFIGS;
          currentConfigs[tenantId] = updatedConfig;
          localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
          window.dispatchEvent(new Event("storage"));
        }

        setShowAsaasCheckoutModal(false);
        showNotification(`🎉 Add-on [${targetCatalogItem?.title || targetAddonId}] liberado com sucesso na sua Navbar!`);
        setActiveTab(targetAddonId as any);
      }
    } catch (err) {
      showNotification("Erro no processamento Asaas.");
    } finally {
      setIsProcessingAsaas(false);
    }
  };

  const handleUpdateCustomPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlaylistInput) return;

    const isSpotify = customPlaylistInput.includes("spotify");
    const provider = isSpotify ? "spotify" : "youtube";

    const updatedRadioConfig: RadioIndoorConfig = {
      ...radioConfig,
      provider,
      playlistUrl: customPlaylistInput,
      playlistName: isSpotify ? "Sua Playlist Personalizada no Spotify" : "Sua Playlist Personalizada no YouTube Music",
    };

    setRadioConfig(updatedRadioConfig);

    const updatedConfig: TenantTvConfig = {
      ...tvConfig,
      radioIndoorConfig: updatedRadioConfig,
    };
    setTvConfig(updatedConfig);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("captive_hub_tv_configs");
      const currentConfigs = stored ? JSON.parse(stored) : INITIAL_TV_CONFIGS;
      currentConfigs[tenantId] = updatedConfig;
      localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
    }

    showNotification("✨ Sua playlist de música foi salva com sucesso!");
  };

  const handleAddAudioSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpotMessageInput) return;

    const updatedMessages = [...radioConfig.spotMessages, newSpotMessageInput];
    const updatedRadioConfig: RadioIndoorConfig = {
      ...radioConfig,
      spotMessages: updatedMessages,
    };

    setRadioConfig(updatedRadioConfig);
    setNewSpotMessageInput("");

    const updatedConfig: TenantTvConfig = {
      ...tvConfig,
      radioIndoorConfig: updatedRadioConfig,
    };
    setTvConfig(updatedConfig);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("captive_hub_tv_configs");
      const currentConfigs = stored ? JSON.parse(stored) : INITIAL_TV_CONFIGS;
      currentConfigs[tenantId] = updatedConfig;
      localStorage.setItem("captive_hub_tv_configs", JSON.stringify(currentConfigs));
    }

    showNotification("Nova vinheta promocional adicionada!");
  };

  const handleTestAudioSpot = () => {
    setIsPlayingAudioSpot(true);
    if ("speechSynthesis" in window) {
      const textToSpeak = radioConfig.spotMessages[0] || "Atenção clientes! Promoção de Chopp em dobro no balcão!";
      const msg = new SpeechSynthesisUtterance(textToSpeak);
      msg.lang = "pt-BR";
      msg.rate = 1.0;
      msg.onend = () => setIsPlayingAudioSpot(false);
      window.speechSynthesis.speak(msg);
    } else {
      setTimeout(() => setIsPlayingAudioSpot(false), 4000);
    }
  };

  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeName) return;
    const newPrize = { id: `rz_${Date.now()}`, name: newPrizeName, chancePercent: Number(newPrizeChance) };
    setRoletaPrizes((prev) => [...prev, newPrize]);
    setNewPrizeName("");
    showNotification("Novo prêmio adicionado à roleta!");
  };

  const handleSpinWheelSim = () => {
    setIsSpinningWheel(true);
    setWheelResult(null);
    setTimeout(() => {
      setIsSpinningWheel(false);
      const randomPrize = roletaPrizes[Math.floor(Math.random() * roletaPrizes.length)];
      setWheelResult(randomPrize?.name || "10% OFF na Conta");
    }, 3000);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText("00020126580014BR.GOV.BCB.PIX0136captivehub-asaas-pix-key-9821852040005303986540589.005802BR5925CAPTIVEHUB TECNOLOGIA SA6009SAO PAULO62070503***6304D1A4");
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const filteredDevices = connectedDevices.filter(
    (d) =>
      d.hostname.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
      d.ip.includes(deviceSearchTerm) ||
      d.mac.toLowerCase().includes(deviceSearchTerm.toLowerCase())
  );

  const addonStates = tvConfig.addonStates || {};

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header do Tenant */}
      <header className="border-b px-6 py-4 flex items-center justify-between shadow-sm" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {displayTenantName}
            </h1>
            <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              Rede Wi-Fi: <span className="font-semibold text-emerald-600">{displayWifiSsid}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulatorModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Smartphone className="w-4 h-4" /> Visão do Cliente (Mobile)
          </button>
          
          <ThemeToggle />
          <div className="h-6 w-px" style={{ backgroundColor: "var(--border-color)" }} />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
            <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg border text-red-600 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border-color)" }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* NAVBAR DE NAVEGAÇÃO PRINCIPAL DO TENANT (BOTÕES DINÂMICOS PARA CADA ADD-ON COM LOOP DE SETAS) */}
      <nav className="border-b px-4 py-2.5 shadow-sm sticky top-0 z-40 backdrop-blur select-none" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Botão de Rolagem Esquerda (Com Loop Infinito) */}
          <button
            onClick={() => scrollNav("left")}
            className="p-2 rounded-xl border hover:bg-purple-600 hover:text-white transition-all shadow-sm shrink-0 flex items-center justify-center cursor-pointer active:scale-95"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            title="Aba Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Container Scrollável das Abas (Sem barra de rolagem nativa) */}
          <div 
            ref={navContainerRef}
            className="flex items-center gap-2 overflow-x-auto scroll-smooth py-0.5 no-scrollbar flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                activeTab === "dashboard"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              style={{ color: activeTab === "dashboard" ? "#ffffff" : "var(--text-primary)" }}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Início (Dashboard)</span>
            </button>

            {addonStates["midia-indoor"]?.active && (
              <button
                onClick={() => setActiveTab("midia-indoor")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "midia-indoor"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "midia-indoor" ? "#ffffff" : "var(--text-primary)" }}
              >
                <Tv className="w-4 h-4 text-purple-400" />
                <span>Mídia TV & Rádio Indoor</span>
              </button>
            )}

            {addonStates["google-reviews"]?.active && (
              <button
                onClick={() => setActiveTab("google-reviews")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "google-reviews"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "google-reviews" ? "#000000" : "var(--text-primary)" }}
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Reputação Google</span>
              </button>
            )}

            {addonStates["whatsapp-bot"]?.active && (
              <button
                onClick={() => setActiveTab("whatsapp-bot")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "whatsapp-bot"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "whatsapp-bot" ? "#ffffff" : "var(--text-primary)" }}
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Bot</span>
              </button>
            )}

            {addonStates["roleta-da-sorte"]?.active && (
              <button
                onClick={() => setActiveTab("roleta-da-sorte")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "roleta-da-sorte"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "roleta-da-sorte" ? "#ffffff" : "var(--text-primary)" }}
              >
                <Dices className="w-4 h-4 text-rose-300" />
                <span>Roleta da Sorte</span>
              </button>
            )}

            {addonStates["loja-produtos"]?.active && (
              <button
                onClick={() => setActiveTab("loja-produtos")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "loja-produtos"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "loja-produtos" ? "#ffffff" : "var(--text-primary)" }}
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Loja & Estoque</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                  Vendas Pix
                </span>
              </button>
            )}

            {(addonStates["midia-indoor"]?.active || addonStates["captive-portal"]?.active) && (
              <button
                onClick={() => setActiveTab("carrossel")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "carrossel"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "carrossel" ? "#ffffff" : "var(--text-primary)" }}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Anúncios & Banners</span>
              </button>
            )}

            {(addonStates["captive-portal"]?.active) && (
              <button
                onClick={() => setActiveTab("captive-portal")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "captive-portal"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "captive-portal" ? "#ffffff" : "var(--text-primary)" }}
              >
                <Wifi className="w-4 h-4 text-blue-400 stroke-[2.5]" />
                <span>Módulo Wi-Fi & Captive Portal</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 font-extrabold uppercase">
                  Módulo Ativo
                </span>
              </button>
            )}

            {addonStates["web-guard"]?.active && (
              <button
                onClick={() => setActiveTab("web-guard")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "web-guard"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "web-guard" ? "#ffffff" : "var(--text-primary)" }}
              >
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span>Web Guard</span>
              </button>
            )}

            {addonStates["multi-unidades"]?.active && (
              <button
                onClick={() => setActiveTab("multi-unidades")}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "multi-unidades"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{ color: activeTab === "multi-unidades" ? "#ffffff" : "var(--text-primary)" }}
              >
                <Building className="w-4 h-4 text-cyan-300" />
                <span>Multi-Unidades</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("servicos")}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                activeTab === "servicos"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Contratar Serviços</span>
            </button>
          </div>

          {/* Botão de Rolagem Direita (Com Loop Infinito) */}
          <button
            onClick={() => scrollNav("right")}
            className="p-2 rounded-xl border hover:bg-purple-600 hover:text-white transition-all shadow-sm shrink-0 flex items-center justify-center cursor-pointer active:scale-95"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            title="Próxima Aba"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      </nav>

      {/* Conteúdo Principal base de acordo com a aba selecionada */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* ========================================================================= */}
        {activeTab === "captive-portal" && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner Informativo do Módulo Captive Portal */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                  <Wifi className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    Módulo de Wi-Fi Social & Captive Portal MikroTik
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-extrabold uppercase">Módulo Ativado</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ofereça Wi-Fi cortesia em troca de cadastro, promova seu cardápio digital e venda planos de navegação via Pix direto no seu roteador.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Wifi className="w-6 h-6 text-blue-600" />
                  Gerenciamento do Captive Portal & Planos de Banda (Mbps)
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Configure os valores cobrados por cada plano de Wi-Fi via PIX e atribua os limites de velocidade pelo roteador MikroTik.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveCaptivePortalSettings}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Salvar Alterações
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: PLANOS PIX MONETIZADOS & LIMITES DE BANDA */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Zap className="w-5 h-5 text-amber-500" />
                    Tabela de Planos de Wi-Fi Monetizados (PIX)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajuste o valor (R$) e o limite de velocidade de navegação (Mbps) para cada opção no smartphone do cliente.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddPlanModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Novo Plano
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {pixPlansList.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-5 rounded-2xl border space-y-4 shadow-sm relative transition-all ${
                      plan.recommended ? "border-blue-500 ring-2 ring-blue-500/20" : ""
                    }`}
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: plan.recommended ? undefined : "var(--border-color)" }}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] uppercase shadow">
                        Mais Vendido
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{plan.title}</h4>
                      <button
                        onClick={() => handleDeletePixPlan(plan.id)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10"
                        title="Excluir plano"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 font-medium">{plan.durationText}</p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400">Preço (R$)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            value={plan.price}
                            onChange={(e) => handleUpdatePlanPriceAndSpeed(plan.id, parseFloat(e.target.value) || 0, plan.speedLimit)}
                            className="w-full pl-8 pr-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400">Limite Banda (Mbps)</label>
                        <input
                          type="text"
                          value={plan.speedLimit}
                          onChange={(e) => handleUpdatePlanPriceAndSpeed(plan.id, plan.price, e.target.value)}
                          placeholder="Ex: 50 Mbps"
                          className="w-full px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 2: REGRA DE ACESSO GRÁTIS COM PATROCÍNIO/ANÚNCIO */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Regra do Wi-Fi Cortesia com Anúncio Patrocinado
                </h3>
                <p className="text-xs text-slate-400">
                  Defina se os clientes podem acessar o Wi-Fi gratuitamente após assistirem aos seus anúncios ou vídeos institucionais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <span className="text-xs font-bold text-slate-400">Acesso Cortesia Habilitado</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold">{freeAccessEnabled ? "Sim (Liberado)" : "Não (Somente Pago)"}</span>
                    <button
                      onClick={() => setFreeAccessEnabled(!freeAccessEnabled)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        freeAccessEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-400"
                      }`}
                    >
                      {freeAccessEnabled ? "ATIVO" : "DESATIVADO"}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <span className="text-xs font-bold text-slate-400">Duração Cortesia (Minutos)</span>
                  <input
                    type="number"
                    value={freeAccessDurationMinutes}
                    onChange={(e) => setFreeAccessDurationMinutes(parseInt(e.target.value) || 20)}
                    className="w-full p-2 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <span className="text-xs font-bold text-slate-400">Tempo Exibição Anúncio (Segundos)</span>
                  <input
                    type="number"
                    value={adWatchSeconds}
                    onChange={(e) => setAdWatchSeconds(parseInt(e.target.value) || 15)}
                    className="w-full p-2 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            </div>

          </div>
        )}
        
        {/* ========================================================================= */}
        {/* ABA 1: INÍCIO (DASHBOARD COMPLETO COM ESTATÍSTICAS E TABELA DE DISPOSITIVOS) */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Central do Estabelecimento — Engajamento & Desempenho
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Acompanhe a interação dos seus clientes com a Mídia TV, Avaliações Google, Leads WhatsApp e Módulo Wi-Fi.
                </p>
              </div>

              <a
                href={`/portal/${tenantId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                <Eye className="w-4 h-4 text-blue-600" /> Abrir Portal em Nova Aba
              </a>
            </div>

            {/* Grid de Cards Principais de Estatística do Estabelecimento (Apenas Módulos Ativos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(addonStates["whatsapp-bot"]?.active || addonStates["captive-portal"]?.active) && (
                <div className="p-5 rounded-2xl border shadow-sm space-y-2" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Leads & Contatos</span>
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600">{capturedLeadsList.length} Clientes</p>
                  <p className="text-xs text-emerald-600 font-medium">{capturedLeadsList.length > 0 ? "Capturados via WhatsApp/Wi-Fi" : "Nenhum lead capturado ainda"}</p>
                </div>
              )}

              {addonStates["google-reviews"]?.active && (
                <div className="p-5 rounded-2xl border shadow-sm space-y-2" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Reputação Google</span>
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-500">0 Votos</p>
                  <p className="text-xs font-medium text-amber-600">Aguardando avaliações NPS</p>
                </div>
              )}

              {addonStates["midia-indoor"]?.active && (
                <div className="p-5 rounded-2xl border shadow-sm space-y-2" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Mídia TV & Exibições</span>
                    <Tv className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-purple-600">{tvPlaylist.length} Mídias</p>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Ativas na Playlist da TV</p>
                </div>
              )}

              {addonStates["captive-portal"]?.active && (
                <div className="p-5 rounded-2xl border shadow-sm space-y-2" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Módulo Wi-Fi Hotspot</span>
                    <Wifi className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-blue-600">{connectedDevices.length} Online</p>
                  <p className="text-xs font-medium text-blue-600">R$ 0,00 vendas Pix hoje</p>
                </div>
              )}
            </div>

            {/* BARRA DE AÇÕES RÁPIDAS DO ESTABELECIMENTO */}
            <div className="rounded-2xl border p-5 shadow-sm space-y-3" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Ações Rápidas do Estabelecimento
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {addonStates["midia-indoor"]?.active && (
                  <button
                    onClick={() => setActiveTab("midia-indoor")}
                    className="p-3 rounded-xl border flex items-center gap-3 hover:border-purple-500 hover:bg-purple-500/5 transition-all text-left"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <Tv className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Mídia Indoor TV</p>
                      <p className="text-[10px] text-slate-400">Atualizar vídeos e fotos</p>
                    </div>
                  </button>
                )}

                {addonStates["google-reviews"]?.active && (
                  <button
                    onClick={() => setActiveTab("google-reviews")}
                    className="p-3 rounded-xl border flex items-center gap-3 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-left"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <Star className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Google NPS</p>
                      <p className="text-[10px] text-slate-400">Captar avaliações 5★</p>
                    </div>
                  </button>
                )}

                {addonStates["loja-produtos"]?.active && (
                  <button
                    onClick={() => setActiveTab("loja-produtos")}
                    className="p-3 rounded-xl border flex items-center gap-3 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-left"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <ShoppingBag className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Loja & Estoque</p>
                      <p className="text-[10px] text-slate-400">Produtos & Vendas Pix</p>
                    </div>
                  </button>
                )}

                {addonStates["captive-portal"]?.active && (
                  <button
                    onClick={() => setActiveTab("captive-portal")}
                    className="p-3 rounded-xl border flex items-center gap-3 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-left"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <Wifi className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Módulo Wi-Fi</p>
                      <p className="text-[10px] text-slate-400">Planos Pix e Cortesia</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* PAINEL COMPLETO DE DISPOSITIVOS CONECTADOS NO MIKROTIK */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Dispositivos Conectados em Tempo Real</h3>
                    <p className="text-xs text-slate-400">Clientes ativos no hotspot MikroTik da sua loja.</p>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={deviceSearchTerm}
                    onChange={(e) => setDeviceSearchTerm(e.target.value)}
                    placeholder="Buscar IP, MAC ou Nome..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-color)" }}>
                      <th className="py-3 px-4">Dispositivo</th>
                      <th className="py-3 px-4">IP & MAC</th>
                      <th className="py-3 px-4">Sinal Wi-Fi</th>
                      <th className="py-3 px-4">Plano</th>
                      <th className="py-3 px-4">Velocidade / Consumo</th>
                      <th className="py-3 px-4">Tempo Conectado</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {filteredDevices.map((device) => (
                      <tr key={device.id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold" style={{ color: "var(--text-primary)" }}>{device.hostname}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{device.ip} • {device.mac}</td>
                        <td className="py-3.5 px-4 text-emerald-600 font-bold">{device.signalRssi} dBm</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                            {device.accessType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                          {device.downloadSpeed} ({device.bytesUsed})
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">{device.connectedTime}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDisconnectDevice(device.id, device.hostname)}
                            className="px-2.5 py-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 text-[10px] font-bold transition-all"
                            style={{ borderColor: "var(--border-color)" }}
                          >
                            Desconectar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: CARROSSEL DE ANÚNCIOS & CONFIGURAÇÃO DO LINK PRINCIPAL             */}
        {/* ========================================================================= */}
        {activeTab === "carrossel" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Gerenciador de Carrossel de Anúncios & Link de Destaque
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Configure as ofertas exibidas no smartphone do cliente ao conectar no Wi-Fi e defina o botão principal (Cardápio Digital, Instagram, WhatsApp).
                </p>
              </div>

              <button
                onClick={() => setShowAddBannerModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Adicionar Imagem ao Carrossel
              </button>
            </div>

            {/* SEÇÃO 1: FORMULÁRIO DO LINK DE DESTAQUE / CARDÁPIO DIGITAL */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <form onSubmit={handleSaveMenuConfig} className="space-y-5 border-b pb-6" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                      Botão de Destaque no Smartphone (Cardápio / Instagram / WhatsApp)
                    </h3>
                  </div>
                  {menuSaved && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Salvo!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Título do Botão / Serviço:
                    </label>
                    <input
                      type="text"
                      value={digitalMenuTitle}
                      onChange={(e) => setDigitalMenuTitle(e.target.value)}
                      placeholder="Ex: Cardápio Digital & Promoções"
                      className="w-full p-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Texto no Botão Principal:
                    </label>
                    <input
                      type="text"
                      value={digitalMenuButtonText}
                      onChange={(e) => setDigitalMenuButtonText(e.target.value)}
                      placeholder="Ex: Abrir Cardápio Digital"
                      className="w-full p-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    URL / Link de Destino (Cardápio, Instagram ou WhatsApp):
                  </label>
                  <input
                    type="url"
                    value={digitalMenuUrl}
                    onChange={(e) => setDigitalMenuUrl(e.target.value)}
                    placeholder="https://sualoja.com/cardapio ou https://instagram.com/sualoja"
                    className="w-full p-2.5 rounded-xl border text-xs font-mono"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    <input
                      type="checkbox"
                      checked={autoRedirectToMenu}
                      onChange={(e) => setAutoRedirectToMenu(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Redirecionar o cliente automaticamente para este link após liberar o Wi-Fi</span>
                  </label>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar Configurações do Link
                  </button>
                </div>
              </form>

              {/* SEÇÃO 2: GERENCIAMENTO DAS IMAGENS DO CARROSSEL & SIMULADOR */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Imagens Ativas no Carrossel ({banners.length})</h4>
                  <div className="space-y-3">
                    {banners.map((banner) => (
                      <div key={banner.id} className="p-3 rounded-xl border flex items-center justify-between gap-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={banner.imageUrl} alt={banner.title} className="w-14 h-14 rounded-lg object-cover border shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{banner.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{banner.subtitle || "Sem subtítulo"}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteBanner(banner.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pré-visualização no Celular do Cliente</h4>
                  <div className="p-3 rounded-2xl border bg-slate-950 shadow-inner" style={{ borderColor: "var(--border-color)" }}>
                    <BannerCarousel banners={banners} autoPlayInterval={4000} compact />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA MÍDIA INDOOR (TV PLAYER DIGITAL SIGNAGE)                              */}
        {/* ========================================================================= */}
        {activeTab === "midia-indoor" && (addonStates["midia-indoor"]?.active || tvConfig.addonActive) && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Mídia Indoor (TV Player Digital Signage)
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Transmita fotos promocionais e vídeos MP4 em Smart TV ou Firestick com QR Code Pix na tela.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const tvUrl = `${window.location.origin}/tv/${tenantId}`;
                    navigator.clipboard.writeText(tvUrl);
                    showNotification("📋 URL da Mídia Indoor copiada com sucesso!");
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Copy className="w-4 h-4" /> Copiar URL da TV
                </button>
                <a
                  href={`/tv/${tenantId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  <Tv className="w-4 h-4" /> Lançar TV Player em Nova Aba
                </a>
              </div>
            </div>

            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Playlist Transmitida na Smart TV</h3>
                <button
                  onClick={() => setShowAddTvMediaModal(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" /> Adicionar Foto ou Vídeo MP4
                </button>
              </div>

              <div className="space-y-3">
                {tvPlaylist.map((media) => (
                  <div key={media.id} className="p-3.5 rounded-xl border flex items-center justify-between gap-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                    <div className="flex items-center gap-3">
                      {media.type === "video" ? (
                        <div className="w-16 h-12 rounded-lg bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-[10px]">
                          <Video className="w-5 h-5" />
                        </div>
                      ) : (
                        <img src={media.url} alt={media.title} className="w-16 h-12 rounded-lg object-cover border" />
                      )}
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{media.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {media.type === "video"
                            ? media.muteVideoKeepRadio
                              ? "🔊 Vídeo Mudo (Tocando Músicas da Rádio Indoor em Segundo Plano)"
                              : "🎬 Áudio Próprio do Vídeo (Muta a Rádio Indoor Durante o Vídeo)"
                            : `Foto (Exibição: ${media.durationSeconds || 8}s)`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTvMedia(media.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO DE PERSONALIZAÇÃO DE ELEMENTOS DA TV */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Sparkles className="w-5 h-5 text-purple-500" /> Autonomia & Personalização da Tela da TV
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Escolha exatamente quais informações, overlays e widgets devem aparecer ou ser ocultados na tela da sua Smart TV.
                  </p>
                </div>
                <button
                  onClick={handleSaveTvOverlaySettings}
                  disabled={isSavingTvOverlays}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shrink-0"
                >
                  <Save className="w-4 h-4" /> {isSavingTvOverlays ? "Salvando..." : "Salvar Personalização do Layout"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TOGGLE QR CODE */}
                <div className="p-4 rounded-xl border flex items-start justify-between gap-4" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      <QrCode className="w-4 h-4 text-emerald-500" /> Card do QR Code (Wi-Fi & Pix)
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Exibe no rodapé o QR Code para o cliente escanear o Wi-Fi ou acessar o cardápio Pix.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showQrOverlay}
                      onChange={(e) => setShowQrOverlay(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* TOGGLE RELÓGIO DIGITAL */}
                <div className="p-4 rounded-xl border flex items-start justify-between gap-4" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      <Clock className="w-4 h-4 text-amber-500" /> Relógio Digital em Tempo Real
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Exibe a hora atual formatada junto às informações do rodapé da TV.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showClockOverlay}
                      onChange={(e) => setShowClockOverlay(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* TOGGLE RÁDIO INDOOR BADGE */}
                <div className="p-4 rounded-xl border flex items-start justify-between gap-4" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      <Headphones className="w-4 h-4 text-indigo-500" /> Card da Rádio Indoor no Topo
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Exibe o indicador animado com a playlist do Spotify/YouTube em execução no ambiente.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showRadioBadge}
                      onChange={(e) => setShowRadioBadge(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* TOGGLE BANNER DE TÍTULO / DESTAQUE */}
                <div className="p-4 rounded-xl border flex items-start justify-between gap-4" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      <Tv className="w-4 h-4 text-purple-500" /> Banner de Título & Destaque
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Exibe a legenda com o título da promoção e etiqueta "Destaque da Casa" no rodapé.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showTitleOverlay}
                      onChange={(e) => setShowTitleOverlay(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE CONFIGURAÇÃO DO POPUP DE CTA PERIÓDICO (INSTAGRAM / LINKS) */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Instagram className="w-5 h-5 text-pink-500" /> Popup de CTA & QR Code Periódico (Ex: Instagram / WhatsApp)
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Exiba automaticamente de tempos em tempos um popup em tela cheia com QR Code direcionando os clientes para o seu Instagram ou Link personalizado.
                  </p>
                </div>
                <button
                  onClick={handleSaveTvOverlaySettings}
                  disabled={isSavingTvOverlays}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shrink-0"
                >
                  <Save className="w-4 h-4" /> {isSavingTvOverlays ? "Salvando..." : "Salvar Configurações de CTA"}
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border flex items-center justify-between gap-4" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div>
                    <span className="text-xs font-bold block" style={{ color: "var(--text-primary)" }}>Ativar Popup de CTA Periódico na TV</span>
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Se ativado, um modal elegante com o QR Code abrirá na TV conforme a frequência configurada.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={customCtaEnabled}
                      onChange={(e) => setCustomCtaEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {customCtaEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Título da Chamada (CTA):</label>
                      <input
                        type="text"
                        value={customCtaTitle}
                        onChange={(e) => setCustomCtaTitle(e.target.value)}
                        placeholder="Ex: Siga nosso Instagram @vilaboemiabar!"
                        className="w-full px-4 py-2.5 rounded-xl border text-xs"
                        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Link do QR Code (URL):</label>
                      <input
                        type="url"
                        value={customCtaUrl}
                        onChange={(e) => setCustomCtaUrl(e.target.value)}
                        placeholder="https://instagram.com/seu.perfil"
                        className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono"
                        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Subtítulo / Mensagem para o Cliente:</label>
                      <input
                        type="text"
                        value={customCtaSubtitle}
                        onChange={(e) => setCustomCtaSubtitle(e.target.value)}
                        placeholder="Ex: Aponte a câmera do seu celular para conferir novidades, marcas e ofertas!"
                        className="w-full px-4 py-2.5 rounded-xl border text-xs"
                        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Frequência (Intervalo):</label>
                      <select
                        value={customCtaIntervalMinutes}
                        onChange={(e) => setCustomCtaIntervalMinutes(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl border text-xs"
                        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      >
                        <option value={2}>A cada 2 minutos (Teste Rápido)</option>
                        <option value={5}>A cada 5 minutos (Recomendado)</option>
                        <option value={10}>A cada 10 minutos</option>
                        <option value={15}>A cada 15 minutos</option>
                        <option value={30}>A cada 30 minutos</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Duração na Tela:</label>
                      <select
                        value={customCtaDurationSeconds}
                        onChange={(e) => setCustomCtaDurationSeconds(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl border text-xs"
                        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      >
                        <option value={10}>Exibir por 10 segundos</option>
                        <option value={15}>Exibir por 15 segundos (Recomendado)</option>
                        <option value={20}>Exibir por 20 segundos</option>
                        <option value={30}>Exibir por 30 segundos</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO UNIFICADA: CONFIGURAÇÃO DE RÁDIO INDOOR & SOM AMBIENTE */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Headphones className="w-5 h-5 text-indigo-500" /> Rádio Indoor Comercial (Som Ambiente + Vinhetas da TV)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cole qualquer link de playlist do <strong>Spotify</strong> ou <strong>YouTube Music</strong> para tocar suas músicas em segundo plano na Smart TV da loja.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-500 uppercase font-mono">
                  Provedor: {radioConfig.provider.toUpperCase()}
                </span>
              </div>

              <form onSubmit={handleUpdateCustomPlaylist} className="p-5 rounded-2xl border space-y-4 shadow-sm" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Link da sua Playlist do Spotify ou YouTube Music:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      required
                      value={customPlaylistInput}
                      onChange={(e) => setCustomPlaylistInput(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/... ou https://www.youtube.com/playlist?list=..."
                      className="w-full px-4 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 shrink-0"
                    >
                      <PlayCircle className="w-4 h-4" /> Carregar Minha Playlist
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-xs flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Music className="w-4 h-4" /> Playlist Atual Tocando no Player da TV:
                  </span>
                  <span className="font-semibold text-[11px] underline">{radioConfig.playlistName}</span>
                </div>
              </form>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Player ao Vivo Transmitido no Som da Loja</h4>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30">
                    {radioConfig.provider === "spotify" ? (
                      <iframe src={parseSpotifyEmbedUrl(radioConfig.playlistUrl)} width="100%" height="180" frameBorder="0" allow="autoplay; encrypted-media" />
                    ) : (
                      <iframe width="100%" height="180" src={parseYouTubeEmbedUrl(radioConfig.playlistUrl)} frameBorder="0" allow="autoplay; encrypted-media" />
                    )}
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vinhetas Promocionais da Loja</h4>
                  <div className="p-4 rounded-2xl border space-y-4" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                    <form onSubmit={handleAddAudioSpot} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newSpotMessageInput}
                          onChange={(e) => setNewSpotMessageInput(e.target.value)}
                          placeholder="Ex: Chopp em dobro na mesa 4!"
                          className="w-full px-3 py-2 rounded-xl border text-xs"
                          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                        />
                        <button type="submit" className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shrink-0">+ Adicionar</button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {radioConfig.spotMessages.map((msg, i) => (
                        <div key={i} className="p-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs font-medium flex items-center justify-between" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                          <span>{msg}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold">Vinheta #{i+1}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleTestAudioSpot}
                      disabled={isPlayingAudioSpot}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                    >
                      <Volume2 className={`w-4 h-4 ${isPlayingAudioSpot ? "animate-pulse text-amber-300" : ""}`} />
                      <span>{isPlayingAudioSpot ? "Reproduzindo Vinheta no Som..." : "Testar Locução da Vinheta Promocional no Som"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA DEDICADA ⭐ REPUTAÇÃO GOOGLE MAPS (NPS)                              */}
        {/* ========================================================================= */}
        {activeTab === "google-reviews" && addonStates["google-reviews"]?.active && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  ⭐ Reputação Automática no Google Maps & Pesquisa NPS
                </h2>
                <p className="text-sm text-slate-400">
                  Filtre notas de 1 a 5 estrelas no Wi-Fi para alavancar suas avaliações positivas no Google.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs border border-amber-500/20">
                Add-on Ativo
              </span>
            </div>

            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400">URL do Perfil do Google Meu Negócio (Link de Avaliação):</label>
                  <input
                    type="url"
                    value={googleUrlInput}
                    onChange={(e) => setGoogleUrlInput(e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs font-mono"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400">WhatsApp do Gerente para Criticas (Notas 1 a 3 estrelas):</label>
                  <input
                    type="text"
                    value={managerWhatsapp}
                    onChange={(e) => setManagerWhatsapp(e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs font-mono"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs space-y-2">
                  <p className="font-bold flex items-center gap-1.5"><Star className="w-4 h-4 fill-amber-500" /> Filtro de Proteção da Nota:</p>
                  <p>Clientes que derem <strong>4 ou 5 estrelas</strong> são direcionados ao Google Maps. Avaliações de 1 a 3 estrelas abrem caixa de feedback privado enviada direto ao WhatsApp do Gerente.</p>
                </div>

                <button onClick={() => showNotification("Regras da Avaliação Google salvas com sucesso!")} className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md">
                  Salvar Configurações da Avaliação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA DEDICADA 📱 WHATSAPP BOT & LEADS                                      */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* ABA DEDICADA 📱 WHATSAPP BOT & LEADS CRM                                  */}
        {/* ========================================================================= */}
        {activeTab === "whatsapp-bot" && addonStates["whatsapp-bot"]?.active && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <MessageSquare className="w-6 h-6 text-emerald-600" />
                  WhatsApp Bot, CRM & Automação de Retenção
                </h2>
                <p className="text-sm text-slate-400">
                  Configure mensagens automáticas de boas-vindas, lembretes de retorno e disparos diretos para seus clientes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => showNotification("Arquivo CSV de leads exportado!")} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20">
                  <Download className="w-4 h-4" /> Baixar Lista em CSV
                </button>
              </div>
            </div>

            {/* Grid de 3 Cards com Estatísticas do WhatsApp Bot */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Leads no Banco de Dados</span>
                <p className="text-2xl font-black text-emerald-600">{capturedLeadsList.length} Clientes</p>
                <p className="text-[11px] text-slate-400">Contatos capturados no Wi-Fi e QR Code</p>
              </div>

              <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Lembretes de Retorno Programados</span>
                <p className="text-2xl font-black text-blue-600">{botReturnReminderDays} Dias</p>
                <p className="text-[11px] text-slate-400">Intervalo automático entre visitas</p>
              </div>

              <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Canaiscaptura Ativos (Sem Wi-Fi)</span>
                <p className="text-2xl font-black text-amber-500">4 Canais</p>
                <p className="text-[11px] text-slate-400">QR Code Balcão, Roleta & WhatsApp Direct</p>
              </div>
            </div>

            {/* CARD DESTACADO: CANAIS DE CAPTURA SEM NECESSIDADE DE WI-FI DEDICADO */}
            <div className="p-6 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      Canaiscaptura de Leads (Funciona Sem Wi-Fi Dedicado / Roteador Compartilhado)
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-extrabold uppercase">Multi-Canal</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Não consegue alterar as configurações do roteador? Imprima o QR Code do Balcão ou use a Roleta Externa para capturar o WhatsApp dos clientes sem depender de rede Wi-Fi!
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Canal 1: Check-in VIP Balcão */}
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 space-y-3" style={{ borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" /> 1. QR Code no Balcão / Espelho
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold uppercase">Check-in VIP</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Imprima o QR Code do Check-in na bancada. O cliente escaneia, cadastra o WhatsApp e ganha um cupom de boas-vindas.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/checkin/${tenantId}`;
                        navigator.clipboard.writeText(url);
                        setCopiedCheckinUrl(true);
                        setTimeout(() => setCopiedCheckinUrl(false), 3000);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/10"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    >
                      {copiedCheckinUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCheckinUrl ? "Copiado!" : "Copiar Link"}</span>
                    </button>
                    <a
                      href={`/checkin/${tenantId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Testar
                    </a>
                  </div>
                </div>

                {/* Canal 2: Roleta Externa */}
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 space-y-3" style={{ borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                      <Dices className="w-4 h-4" /> 2. Roleta da Sorte Externa
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold uppercase">Gamificação</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Disponibilize o QR Code da Roleta na recepção ou sala de espera para os clientes girarem no smartphone.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/roleta/${tenantId}`;
                        navigator.clipboard.writeText(url);
                        setCopiedRoletaUrl(true);
                        setTimeout(() => setCopiedRoletaUrl(false), 3000);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-rose-500/10"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    >
                      {copiedRoletaUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRoletaUrl ? "Copiado!" : "Copiar Link"}</span>
                    </button>
                    <a
                      href={`/roleta/${tenantId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Testar
                    </a>
                  </div>
                </div>

                {/* Canal 3: Cadastro Manual no Balcão */}
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 space-y-3" style={{ borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> 3. Cadastro Rápido no Balcão
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold uppercase">Manual</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    O próprio barbeiro ou recepcionista digita o Nome + WhatsApp do cliente diretamente no formulário abaixo.
                  </p>
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Formulário Ativo no Painel
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* SEÇÃO 1: CONFIGURAÇÃO DE MENSAGENS E REGRAS DO BOT */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Settings className="w-5 h-5 text-emerald-600" />
                    Configuração dos Modelos de Mensagens Automáticas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Utilize as tags dinâmicas <code className="text-emerald-500 font-bold">{`{nome}`}</code>, <code className="text-emerald-500 font-bold">{`{estabelecimento}`}</code> e <code className="text-emerald-500 font-bold">{`{dias}`}</code> para personalizar os disparos.
                  </p>
                </div>
                <button
                  onClick={() => showNotification("Configurações do WhatsApp Bot salvas!")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shrink-0"
                >
                  <Check className="w-4 h-4" /> Salvar Regras do Bot
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Regra 1: Boas Vindas */}
                <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> 1. Boas-Vindas no Wi-Fi
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-extrabold uppercase">Ativo</span>
                  </div>
                  <textarea
                    rows={4}
                    value={botWelcomeMessage}
                    onChange={(e) => setBotWelcomeMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <p className="text-[10px] text-slate-400">Disparado no momento exato em que o cliente se conecta ao hotspot.</p>
                </div>

                {/* Regra 2: Lembrete de Retorno */}
                <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 2. Lembrete de Retorno
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={botReturnReminderDays}
                        onChange={(e) => setBotReturnReminderDays(parseInt(e.target.value) || 15)}
                        className="w-12 px-1.5 py-0.5 rounded border text-[11px] font-bold text-center"
                        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                      />
                      <span className="text-[10px] font-bold text-slate-400">dias</span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={botReturnMessage}
                    onChange={(e) => setBotReturnMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <p className="text-[10px] text-slate-400">Estimula o cliente a agendar o retorno após {botReturnReminderDays} dias sem visita.</p>
                </div>

                {/* Regra 3: Aniversariantes */}
                <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> 3. Cupom de Aniversário
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-extrabold uppercase">Ativo</span>
                  </div>
                  <textarea
                    rows={4}
                    value={botBirthdayMessage}
                    onChange={(e) => setBotBirthdayMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <p className="text-[10px] text-slate-400">Enviado no dia do aniversário do cliente cadastrado no portal.</p>
                </div>

              </div>
            </div>

            {/* SEÇÃO 2: TABELA DE LEADS COM AÇÃO RÁPIDA DE WHATSAPP */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Users className="w-5 h-5 text-emerald-600" />
                    Lista de Clientes & Ações de Disparo no WhatsApp
                  </h3>
                  <p className="text-xs text-slate-400">Clique no botão para abrir o WhatsApp Web ou App com a mensagem pré-formatada.</p>
                </div>

                {/* Form de Cadastro Manual de Lead */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newLeadNameInput || !newLeadPhoneInput) return;
                    const newLead: CapturedLead = {
                      id: `lead_${Date.now()}`,
                      name: newLeadNameInput,
                      whatsapp: newLeadPhoneInput,
                      connectedAt: "Hoje, Agora",
                      birthdate: newLeadBirthdateInput || "01/01/1995",
                      optIn: true,
                    };
                    setCapturedLeadsList([newLead, ...capturedLeadsList]);
                    setNewLeadNameInput("");
                    setNewLeadPhoneInput("");
                    setNewLeadBirthdateInput("");
                    showNotification("Novo cliente cadastrado no CRM!");
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Nome Cliente"
                    value={newLeadNameInput}
                    onChange={(e) => setNewLeadNameInput(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <input
                    type="tel"
                    required
                    placeholder="WhatsApp (ex: 11999998888)"
                    value={newLeadPhoneInput}
                    onChange={(e) => setNewLeadPhoneInput(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <button type="submit" className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0">
                    + Adicionar
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-color)" }}>
                      <th className="py-3 px-4">Nome do Cliente</th>
                      <th className="py-3 px-4">WhatsApp Validado</th>
                      <th className="py-3 px-4">Última Conexão</th>
                      <th className="py-3 px-4">Aniversário</th>
                      <th className="py-3 px-4 text-center">Ações no WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {capturedLeadsList.map((lead) => {
                      const cleanPhone = lead.whatsapp.replace(/\D/g, "");
                      const returnText = encodeURIComponent(
                        botReturnMessage
                          .replace("{nome}", lead.name)
                          .replace("{estabelecimento}", displayTenantName)
                          .replace("{dias}", String(botReturnReminderDays))
                      );
                      const waUrl = `https://wa.me/55${cleanPhone}?text=${returnText}`;

                      return (
                        <tr key={lead.id} className="hover:bg-slate-500/5">
                          <td className="py-3.5 px-4 font-bold" style={{ color: "var(--text-primary)" }}>{lead.name}</td>
                          <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">{lead.whatsapp}</td>
                          <td className="py-3.5 px-4 text-slate-400">{lead.connectedAt}</td>
                          <td className="py-3.5 px-4 font-mono" style={{ color: "var(--text-primary)" }}>{lead.birthdate}</td>
                          <td className="py-3.5 px-4 text-center">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Disparar Lembrete WhatsApp
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA DEDICADA 🎯 ROLETA DA SORTE DIGITAL                                   */}
        {/* ========================================================================= */}
        {activeTab === "roleta-da-sorte" && addonStates["roleta-da-sorte"]?.active && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Dices className="w-6 h-6 text-rose-600" />
                  🎯 Roleta da Sorte Digital & Cupons Promocionais
                </h2>
                <p className="text-sm text-slate-400">
                  Gerencie prêmios, visualize cupons resgatados e compartilhe a página autônoma da roleta via QR Code.
                </p>
              </div>
            </div>

            {/* BANNER DE LINK PÚBLICO E QR CODE DA ROLETA EXTERNA */}
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                  <Dices className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    Link Público da Roleta Externa (Sem Necessidade de Wi-Fi)
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-extrabold uppercase">Link Direto</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono pt-0.5">
                    {typeof window !== "undefined" ? `${window.location.origin}/roleta/${tenantId}` : `/roleta/${tenantId}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/roleta/${tenantId}`;
                    navigator.clipboard.writeText(url);
                    setCopiedRoletaUrl(true);
                    setTimeout(() => setCopiedRoletaUrl(false), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:bg-rose-500/20"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                >
                  {copiedRoletaUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-rose-500" />}
                  <span>{copiedRoletaUrl ? "Link Copiado!" : "Copiar Link"}</span>
                </button>

                <a
                  href={`/roleta/${tenantId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir Roleta Externa
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lado Esquerdo: Cadastro de Prêmios */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Gift className="w-5 h-5 text-rose-600" />
                    Prêmios Ativos na Roleta & Probabilidade (%)
                  </h3>
                  
                  <form onSubmit={handleAddPrize} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newPrizeName}
                      onChange={(e) => setNewPrizeName(e.target.value)}
                      placeholder="Novo Prêmio (ex: 10% OFF na Pomada)"
                      className="flex-1 p-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="number"
                      required
                      value={newPrizeChance}
                      onChange={(e) => setNewPrizeChance(Number(e.target.value))}
                      placeholder="%"
                      className="w-20 p-2.5 rounded-xl border text-xs font-bold text-center"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    />
                    <button type="submit" className="px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md">+ Adicionar</button>
                  </form>

                  <div className="space-y-2">
                    {roletaPrizes.map((prize) => (
                      <div key={prize.id} className="p-3.5 rounded-xl border font-semibold text-xs flex items-center justify-between" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                        <span style={{ color: "var(--text-primary)" }}>🎁 {prize.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-rose-600 font-bold px-2 py-0.5 rounded bg-rose-500/10">{prize.chancePercent}% Chance</span>
                          <button
                            onClick={() => setRoletaPrizes(roletaPrizes.filter((p) => p.id !== prize.id))}
                            className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                            title="Remover prêmio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabela de Ganhadores Recentes */}
                <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Histórico de Ganhadores & Cupons Gerados
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-color)" }}>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Prêmio Sorteado</th>
                          <th className="py-2.5 px-3">Código do Cupom</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                        {roletaWinnersList.map((w) => (
                          <tr key={w.id}>
                            <td className="py-3 px-3 font-bold" style={{ color: "var(--text-primary)" }}>{w.customerName}</td>
                            <td className="py-3 px-3 font-semibold text-rose-600">{w.prizeName}</td>
                            <td className="py-3 px-3 font-mono font-bold text-amber-500">{w.couponCode}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                w.status === "Resgatado" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600 animate-pulse"
                              }`}>
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Simulador Visual em Tempo Real */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border p-6 shadow-sm text-center space-y-4 sticky top-24" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                  <h4 className="text-sm font-bold text-slate-400">Simulador do Giro em Tempo Real</h4>
                  
                  <div className={`w-48 h-48 rounded-full border-8 border-rose-600 mx-auto flex items-center justify-center font-bold text-xs transition-all shadow-xl ${isSpinningWheel ? "animate-spin" : ""}`} style={{ backgroundColor: "var(--bg-primary)" }}>
                    <div className="text-center p-3">
                      <Dices className="w-8 h-8 text-rose-600 mx-auto mb-1" />
                      <span className="font-extrabold text-xs" style={{ color: "var(--text-primary)" }}>Roleta VIP</span>
                    </div>
                  </div>

                  <button onClick={handleSpinWheelSim} disabled={isSpinningWheel} className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all">
                    {isSpinningWheel ? "Girando Roleta de Teste..." : "Girar Roleta de Teste"}
                  </button>

                  {wheelResult && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-extrabold text-xs animate-bounce">
                      🎉 Prêmio Sorteado no Teste: {wheelResult}!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA DEDICADA 🛍️ LOJA VIRTUAL & CONTROLE DE ESTOQUE                       */}
        {/* ========================================================================= */}
        {activeTab === "loja-produtos" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <ShoppingBag className="w-6 h-6 text-emerald-600" />
                  Loja Virtual, Controle de Estoque & Vendas Pix
                </h2>
                <p className="text-sm text-slate-400">
                  Gerencie o catálogo de produtos da sua loja (pomadas, produtos, bebidas), monitore o estoque e acompanhe vendas instantâneas por Pix.
                </p>
              </div>
            </div>

            {/* GRID DE CARDS COM ESTATÍSTICAS DA LOJA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border space-y-1" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Vendas de Produtos Hoje</span>
                <p className="text-2xl font-black text-emerald-600">R$ 119,00</p>
                <p className="text-[11px] text-slate-400">3 itens vendidos via Pix</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-1" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Itens Cadastrados no Catálogo</span>
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{shopProductsList.length} Produtos</p>
                <p className="text-[11px] text-emerald-600 font-medium">Disponíveis no portal/QR code</p>
              </div>

              <div className="p-5 rounded-2xl border space-y-1" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Alertas de Estoque Baixo</span>
                <p className="text-2xl font-black text-rose-600">
                  {shopProductsList.filter((p) => p.stockQty < 5).length} Item(s)
                </p>
                <p className="text-[11px] text-rose-500 font-medium">Requer reposição urgente</p>
              </div>
            </div>

            {/* SEÇÃO 1: CATÁLOGO DE PRODUTOS E GESTÃO DE ESTOQUE */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Package className="w-5 h-5 text-emerald-600" />
                    Catálogo de Produtos & Unidades em Estoque
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajuste o preço (R$) e adicione ou reduza a quantidade disponível em tempo real.
                  </p>
                </div>

                {/* FORM CADASTRO DE NOVO PRODUTO */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newProdName) return;
                    const newProd = {
                      id: `prod_${Date.now()}`,
                      name: newProdName,
                      category: newProdCategory || "Geral",
                      price: Number(newProdPrice),
                      stockQty: Number(newProdStock),
                      imageUrl: newProdImageUrl || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80",
                      active: true,
                    };
                    setShopProductsList([...shopProductsList, newProd]);
                    setNewProdName("");
                    setNewProdPrice(35.00);
                    setNewProdStock(10);
                    setNewProdImageUrl("");
                    showNotification("Novo produto cadastrado na loja!");
                  }}
                  className="flex items-center gap-2 flex-wrap"
                >
                  <input
                    type="text"
                    required
                    placeholder="Nome do Produto"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <input
                    type="number"
                    step="0.50"
                    required
                    placeholder="R$ Preço"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 rounded-lg border text-xs font-bold"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <input
                    type="number"
                    required
                    placeholder="Qtd Estoque"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 rounded-lg border text-xs font-bold text-center"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-md shrink-0">
                    + Adicionar Produto
                  </button>
                </form>
              </div>

              {/* GRID DOS PRODUTOS DA LOJA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shopProductsList.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-2xl border space-y-3 shadow-sm relative flex flex-col justify-between"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}
                  >
                    {prod.stockQty < 5 && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[9px] uppercase shadow">
                        Estoque Baixo ({prod.stockQty})
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="w-full h-32 rounded-xl bg-slate-900 overflow-hidden relative border" style={{ borderColor: "var(--border-color)" }}>
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-600">{prod.category}</span>
                        <h4 className="font-bold text-xs leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>{prod.name}</h4>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--border-color)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Preço:</span>
                        <span className="text-sm font-black text-emerald-600">R$ {prod.price.toFixed(2)}</span>
                      </div>

                      {/* CONTROLE RÁPIDO DE AJUSTE DE ESTOQUE + E - */}
                      <div className="flex items-center justify-between bg-slate-500/5 p-2 rounded-xl border" style={{ borderColor: "var(--border-color)" }}>
                        <span className="text-[11px] font-bold text-slate-400">Estoque:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const updated = shopProductsList.map((p) =>
                                p.id === prod.id ? { ...p, stockQty: Math.max(0, p.stockQty - 1) } : p
                              );
                              setShopProductsList(updated);
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                          >
                            -
                          </button>
                          <span className="font-mono font-black text-xs px-1" style={{ color: "var(--text-primary)" }}>
                            {prod.stockQty} un.
                          </span>
                          <button
                            onClick={() => {
                              const updated = shopProductsList.map((p) =>
                                p.id === prod.id ? { ...p, stockQty: p.stockQty + 1 } : p
                              );
                              setShopProductsList(updated);
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 2: HISTÓRICO DE VENDAS DE PRODUTOS VIA PIX */}
            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Histórico de Vendas de Produtos via Pix
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-color)" }}>
                      <th className="py-2.5 px-3">Cliente Comprador</th>
                      <th className="py-2.5 px-3">Produto Adquirido</th>
                      <th className="py-2.5 px-3">Qtd</th>
                      <th className="py-2.5 px-3">Valor Total</th>
                      <th className="py-2.5 px-3">Data/Hora</th>
                      <th className="py-2.5 px-3">Status Pix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {productSalesList.map((sale) => (
                      <tr key={sale.id}>
                        <td className="py-3 px-3 font-bold" style={{ color: "var(--text-primary)" }}>{sale.customerName}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-600">{sale.productName}</td>
                        <td className="py-3 px-3 font-bold">{sale.quantity}</td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-600">R$ {sale.totalPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-slate-400">{sale.paidAt}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px] uppercase">
                            {sale.pixStatus} (CONFIRMADO)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA DEDICADA 🛡️ WEB GUARD (FILTRO MIKROTIK)                                */}
        {/* ========================================================================= */}
        {activeTab === "web-guard" && addonStates["web-guard"]?.active && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              🛡️ Filtro de Conteúdo & Guardião da Rede MikroTik
            </h2>

            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Regras de Bloqueio DNS & Firewall ROS</h3>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <span style={{ color: "var(--text-primary)" }}>Bloquear Sites de Conteúdo Adulto / Pornografia</span>
                  <input type="checkbox" checked={blockAdult} onChange={(e) => setBlockAdult(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                </label>
                <label className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <span style={{ color: "var(--text-primary)" }}>Bloquear Download de Torrents e P2P</span>
                  <input type="checkbox" checked={blockTorrents} onChange={(e) => setBlockTorrents(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                </label>
                <label className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <span style={{ color: "var(--text-primary)" }}>Bloquear Sites de Apostas e Cassinos Online</span>
                  <input type="checkbox" checked={blockGambling} onChange={(e) => setBlockGambling(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                </label>
              </div>

              <button onClick={() => showNotification("Regras de segurança aplicadas no MikroTik!")} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md">
                Aplicar Regras no Roteador
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA DEDICADA 🏢 MULTI-UNIDADES / FRANQUIAS                                */}
        {/* ========================================================================= */}
        {activeTab === "multi-unidades" && addonStates["multi-unidades"]?.active && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              🏢 Gestão Multi-Unidades & Franquias
            </h2>

            <div className="rounded-2xl border p-6 shadow-sm space-y-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Unidades Vinculadas à Conta Corporativa</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-xl border bg-cyan-500/10 border-cyan-500/20 font-bold text-cyan-600">
                  📍 Unidade Matriz Moema (São Paulo)
                </div>
                <div className="p-4 rounded-xl border font-bold" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                  📍 Filial 02 Jardins (São Paulo)
                </div>
                <div className="p-4 rounded-xl border font-bold" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                  📍 Filial 03 Itaim (São Paulo)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA FIXA 🛒 CONTRATAR SERVIÇOS - MARKETPLACE DOS 7 ADD-ONS                */}
        {/* ========================================================================= */}
        {activeTab === "servicos" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Marketplace de Add-ons & Módulos Adicionais
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Contrate, renove e configure os add-ons do seu estabelecimento com cobrança recorrente automatizada pelo Asaas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ADDONS_CATALOG.map((addon) => {
                const isSubscribed = addonStates[addon.id]?.active || false;
                const AddonIcon = addon.icon;

                return (
                  <div key={addon.id} className={`rounded-2xl border p-6 shadow-md flex flex-col justify-between space-y-5 relative overflow-hidden ${isSubscribed ? "border-emerald-500/50 bg-emerald-500/5" : ""}`} style={{ backgroundColor: isSubscribed ? undefined : "var(--bg-surface)", borderColor: isSubscribed ? undefined : "var(--border-color)" }}>
                    {isSubscribed && (
                      <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" /> Módulo Ativo na Navbar
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <AddonIcon className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{addon.title}</h4>
                      <p className="text-xs text-slate-400">{addon.description}</p>
                    </div>
                    <div className="pt-2">
                      {isSubscribed ? (
                        <button onClick={() => setActiveTab(addon.id as any)} className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md">
                          Abrir Página do Módulo na Navbar
                        </button>
                      ) : (
                        <button onClick={() => openCheckoutForAddon(addon.id)} className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md">
                          Contratar via Asaas Pix
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* MODAL ADICIONAR MÍDIA NA TV */}
      {showAddTvMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-up" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Adicionar Mídia na TV (Foto ou Vídeo MP4)</h3>
              <button onClick={() => setShowAddTvMediaModal(false)} className="text-xs font-bold text-slate-400">✕ Fechar</button>
            </div>

            <form onSubmit={handleAddTvMedia} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewTvMediaType("image")} className={`py-2 rounded-xl border font-bold ${newTvMediaType === "image" ? "bg-purple-600 text-white" : ""}`}>
                  Foto (Imagem)
                </button>
                <button type="button" onClick={() => setNewTvMediaType("video")} className={`py-2 rounded-xl border font-bold ${newTvMediaType === "video" ? "bg-purple-600 text-white" : ""}`}>
                  Vídeo MP4
                </button>
              </div>

              {/* BOTAO / DROPAREA DE BUSCA DE ARQUIVO LOCAL (CLOUDFLARE R2) */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 text-center space-y-2 relative transition-all hover:border-purple-500 cursor-pointer">
                <input
                  type="file"
                  accept={newTvMediaType === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "tvMedia");
                  }}
                  disabled={isUploadingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                
                <div className="flex flex-col items-center justify-center space-y-1">
                  {isUploadingFile ? (
                    <div className="space-y-1 py-2">
                      <RefreshCw className="w-7 h-7 mx-auto text-purple-500 animate-spin" />
                      <p className="font-bold text-purple-600 text-xs">{uploadProgressText || "Enviando arquivo..."}</p>
                      <p className="text-[10px] text-slate-400">Gravando no bucket do Cloudflare R2 com cache permanente...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-purple-500 animate-bounce" />
                      <p className="font-extrabold text-xs" style={{ color: "var(--text-primary)" }}>
                        📁 Buscar arquivo no Computador / Celular
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {newTvMediaType === "image" 
                          ? "Selecione uma imagem (PNG, JPG, WEBP até 150 MB)" 
                          : "Selecione um vídeo MP4/WEBM em HD ou 4K (até 150 MB)"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* PREVIEW DO ARQUIVO UPLOADADO */}
              {newTvMediaUrl && (
                <div className="p-2.5 rounded-xl border bg-slate-950/60 space-y-2" style={{ borderColor: "var(--border-color)" }}>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Arquivo Gravado no Cloudflare R2 (Cache Ativado):
                  </span>
                  {newTvMediaType === "video" ? (
                    <video src={newTvMediaUrl} controls className="w-full h-32 rounded-lg object-cover bg-black" />
                  ) : (
                    <img src={newTvMediaUrl} alt="Preview" className="w-full h-32 rounded-lg object-cover" />
                  )}
                </div>
              )}

              <input type="text" required value={newTvMediaTitle} onChange={(e) => setNewTvMediaTitle(e.target.value)} placeholder="Título do Anúncio *" className="w-full p-2.5 rounded-xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">URL da Mídia (Preenchido automaticamente ao buscar o arquivo):</label>
                <input type="url" value={newTvMediaUrl} onChange={(e) => setNewTvMediaUrl(e.target.value)} placeholder={newTvMediaType === "image" ? "URL da Imagem (opcional se já enviou do dispositivo)" : "URL do Vídeo MP4 (opcional se já enviou do dispositivo)"} className="w-full p-2.5 rounded-xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
              </div>

              {newTvMediaType === "video" && (
                <label className="flex items-start gap-2.5 cursor-pointer text-xs p-3 rounded-xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}>
                  <input
                    type="checkbox"
                    checked={newTvMediaMuteVideoKeepRadio}
                    onChange={(e) => setNewTvMediaMuteVideoKeepRadio(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded"
                  />
                  <div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">Mutar este vídeo e manter a Rádio Indoor tocando</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      • <strong>MARCADO:</strong> Muta o áudio do vídeo MP4 e mantém a Rádio Indoor tocando.<br />
                      • <strong>DESMARCADO:</strong> Muta a Rádio Indoor e toca o áudio/música do próprio vídeo MP4.
                    </p>
                  </div>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddTvMediaModal(false)} className="px-3 py-2 rounded-xl border">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold">Salvar na TV</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT ASAAS */}
      {showAsaasCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scale-up" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Pagamento via Asaas Gateway (Pix Instantâneo)</h3>
              <button onClick={() => setShowAsaasCheckoutModal(false)} className="text-xs font-bold text-slate-400">✕ Fechar</button>
            </div>
            <div className="text-center space-y-3">
              <div className="p-4 rounded-2xl bg-white w-48 h-48 mx-auto border flex items-center justify-center shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    "00020126580014BR.GOV.BCB.PIX0136vaelis-hub-asaas-checkout-pix-key-991204000530398654099.005802BR5925VAELIS HUB TECNOLOGIA SA6009SAO PAULO62070503***6304E8A1"
                  )}`}
                  alt="QR Code Pix Asaas"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <button onClick={copyPixCode} className="w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-500/10">
                {copiedPix ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPix ? "Código Pix Copiado!" : "Copiar Chave Pix Copia e Cola"}</span>
              </button>
            </div>
            <button onClick={handleConfirmAsaasPayment} disabled={isProcessingAsaas} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md">
              {isProcessingAsaas ? "Processando Pagamento..." : "Simular Pagamento Confirmado no Asaas (Webhook)"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR BANNER */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border p-6 max-w-md w-full space-y-4 shadow-2xl" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Adicionar Banner no Celular</h3>
              <button onClick={() => setShowAddBannerModal(false)} className="text-xs font-bold text-slate-400">✕ Fechar</button>
            </div>
            <form onSubmit={handleAddBanner} className="space-y-4 text-xs">
              {/* BOTAO / DROPAREA DE BUSCA DE ARQUIVO LOCAL (CLOUDFLARE R2) */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 text-center space-y-2 relative transition-all hover:border-emerald-500 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "banner");
                  }}
                  disabled={isUploadingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                
                <div className="flex flex-col items-center justify-center space-y-1">
                  {isUploadingFile ? (
                    <div className="space-y-1 py-2">
                      <RefreshCw className="w-7 h-7 mx-auto text-emerald-500 animate-spin" />
                      <p className="font-bold text-emerald-600 text-xs">{uploadProgressText || "Enviando imagem..."}</p>
                      <p className="text-[10px] text-slate-400">Gravando no Cloudflare R2...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-emerald-500 animate-bounce" />
                      <p className="font-extrabold text-xs" style={{ color: "var(--text-primary)" }}>
                        📁 Buscar Imagem no Dispositivo
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Selecione a imagem do banner (PNG, JPG, WEBP)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {newImageUrl && (
                <div className="p-2.5 rounded-xl border bg-slate-950/60 space-y-2" style={{ borderColor: "var(--border-color)" }}>
                  <img src={newImageUrl} alt="Preview Banner" className="w-full h-28 rounded-lg object-cover" />
                </div>
              )}

              <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título da Oferta *" className="w-full p-2.5 rounded-xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="URL da Imagem Banner (opcional se já enviou do dispositivo)" className="w-full p-2.5 rounded-xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddBannerModal(false)} className="px-3 py-2 rounded-xl border">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Salvar Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR PLANO PIX */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Criar Novo Plano de Wi-Fi PIX</h3>
              </div>
              <button onClick={() => setShowAddPlanModal(false)} className="text-xs font-bold text-slate-400">✕ Fechar</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddPixPlan(); }} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400">Título do Plano *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Acesso Super Rápido (4 Horas)"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400">Texto de Duração / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: 4 Horas de alta velocidade sem limites"
                  value={newPlanDurationText}
                  onChange={(e) => setNewPlanDurationText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Valor em R$ *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Limite Banda (Mbps) *</label>
                  <input
                    type="text"
                    required
                    value={newPlanSpeedLimit}
                    onChange={(e) => setNewPlanSpeedLimit(e.target.value)}
                    placeholder="Ex: 50 Mbps"
                    className="w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkRecommended"
                  checked={newPlanRecommended}
                  onChange={(e) => setNewPlanRecommended(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="chkRecommended" className="font-semibold text-slate-300 cursor-pointer">
                  Destacar como "Mais Vendido / Recomendado"
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-3 py-2 rounded-xl border font-bold text-slate-400 hover:bg-slate-500/10"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">
                  Adicionar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileDeviceSimulator tenantId={tenantId} isOpen={showSimulatorModal} onClose={() => setShowSimulatorModal(false)} />

    </div>
  );
}
