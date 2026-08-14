export interface TvMediaItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  durationSeconds?: number;
  active: boolean;
  muteVideoKeepRadio?: boolean; // Se true: muta o som do vídeo e deixa a Rádio Indoor tocando. Se false: muta a Rádio Indoor e toca o áudio do vídeo!
}

export type PlanCycle = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';
export type AsaasPaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export type AddonModuleId = 
  | 'midia-indoor' 
  | 'radio-indoor' 
  | 'google-reviews' 
  | 'whatsapp-bot' 
  | 'roleta-da-sorte' 
  | 'web-guard' 
  | 'multi-unidades' 
  | 'captive-portal'
  | 'loja-produtos'
  | 'wifi-vip';

export interface AddonConfigState {
  active: boolean;
  subscriptionExpiresAt?: string;
  planCycle?: PlanCycle;
  paymentStatus?: AsaasPaymentStatus;
  asaasPaymentId?: string;
}

export interface RadioIndoorConfig {
  provider: 'spotify' | 'youtube' | 'custom';
  playlistUrl: string;
  playlistName: string;
  spotIntervalMinutes: number;
  spotMessages: string[];
  syncWithSmartTv?: boolean;
}

export interface GoogleReviewsConfig {
  googleMapsUrl: string;
  minRatingForGoogle: number;
  managerWhatsapp: string;
}

export interface WhatsappBotConfig {
  otpType: 'whatsapp' | 'sms';
  welcomeMessage: string;
  capturedLeadsCount: number;
}

export interface RoletaSorteConfig {
  prizes: Array<{ id: string; name: string; chancePercent: number }>;
}

export interface WebGuardConfig {
  blockAdultContent: boolean;
  blockTorrents: boolean;
  blockGambling: boolean;
  userSpeedLimitMbps: number;
}

export interface TenantTvConfig {
  tenantId: string;
  tenantName: string;
  primaryColor?: string;
  wifiSsid?: string;
  pairingCode: string;
  addonActive: boolean;
  showQrOverlay: boolean;
  showClockOverlay: boolean;
  showRadioBadge?: boolean;
  showTitleOverlay?: boolean;
  showHeaderLogo?: boolean;
  customCtaEnabled?: boolean;
  customCtaTitle?: string;
  customCtaSubtitle?: string;
  customCtaUrl?: string;
  customCtaIntervalMinutes?: number;
  customCtaDurationSeconds?: number;
  playlist: TvMediaItem[];
  subscriptionExpiresAt?: string;
  planCycle?: PlanCycle;
  paymentStatus?: AsaasPaymentStatus;
  asaasPaymentId?: string;
  autoRenew?: boolean;

  addonStates: Partial<Record<AddonModuleId, AddonConfigState>>;
  radioIndoorConfig?: RadioIndoorConfig;
  googleReviewsConfig?: GoogleReviewsConfig;
  whatsappBotConfig?: WhatsappBotConfig;
  roletaSorteConfig?: RoletaSorteConfig;
  webGuardConfig?: WebGuardConfig;
}

// Helpers para converter URLs normais de Spotify e YouTube para Iframe Embed
export function parseSpotifyEmbedUrl(url: string): string {
  if (!url) return "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0";
  if (url.includes("open.spotify.com/embed/")) return url;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    if (pathname.length > 1) {
      return `https://open.spotify.com/embed${pathname}?utm_source=generator&theme=0`;
    }
  } catch (e) {}

  return "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0";
}

export function parseYouTubeEmbedUrl(url: string): string {
  if (!url) return "https://www.youtube.com/embed/videoseries?list=PL4fGSI1pDJn6jWSV0Tz2uWp6h-Zly-gM-&autoplay=1&enablejsapi=1";
  if (url.includes("youtube.com/embed/")) {
    return url.includes("?") ? `${url}&autoplay=1&enablejsapi=1` : `${url}?autoplay=1&enablejsapi=1`;
  }

  try {
    const parsed = new URL(url);
    const listParam = parsed.searchParams.get("list");
    if (listParam) {
      return `https://www.youtube.com/embed/videoseries?list=${listParam}&autoplay=1&enablejsapi=1`;
    }

    const vParam = parsed.searchParams.get("v");
    if (vParam) {
      return `https://www.youtube.com/embed/${vParam}?autoplay=1&enablejsapi=1`;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;
    }
  } catch (e) {}

  return "https://www.youtube.com/embed/videoseries?list=PL4fGSI1pDJn6jWSV0Tz2uWp6h-Zly-gM-&autoplay=1&enablejsapi=1";
}

export const INITIAL_TV_CONFIGS: Record<string, TenantTvConfig> = {
  tenant_bar_01: {
    tenantId: 'tenant_bar_01',
    tenantName: 'Vila Boêmia Bar & Shows',
    pairingCode: 'TV-8492',
    addonActive: true,
    showQrOverlay: true,
    showClockOverlay: true,
    showRadioBadge: true,
    showTitleOverlay: true,
    showHeaderLogo: true,
    planCycle: 'MENSAL',
    paymentStatus: 'PAID',
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    asaasPaymentId: 'pay_asaas_849201',
    autoRenew: true,

    addonStates: {},

    radioIndoorConfig: {
      provider: 'spotify',
      playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
      playlistName: 'Hits da Boêmia & Sertanejo (Sua Playlist Spotify)',
      spotIntervalMinutes: 15,
      syncWithSmartTv: true,
      spotMessages: [
        '📢 Chopp em Dobro no Bar até às 21h! Peça pelo cardápio digital.',
        '📸 Posta um story no Instagram e marca @vilaboemiabar para ganhar um shot de cortesia!',
        '🍟 Experimente nosso Hambúrguer Artesanal com batata rústica.',
      ],
    },

    googleReviewsConfig: {
      googleMapsUrl: 'https://maps.google.com/?cid=123456789',
      minRatingForGoogle: 4,
      managerWhatsapp: '5511999887766',
    },

    whatsappBotConfig: {
      otpType: 'whatsapp',
      welcomeMessage: 'Bem-vindo ao Vila Boêmia Bar! Aproveite seu Wi-Fi Grátis.',
      capturedLeadsCount: 342,
    },

    roletaSorteConfig: {
      prizes: [
        { id: 'rz1', name: '10% de Desconto na Conta', chancePercent: 30 },
        { id: 'rz2', name: 'Shot de Cortesia no Bar', chancePercent: 20 },
        { id: 'rz3', name: 'Batata Rústica Grátis', chancePercent: 10 },
        { id: 'rz4', name: 'Tente Novamente', chancePercent: 40 },
      ],
    },

    webGuardConfig: {
      blockAdultContent: true,
      blockTorrents: true,
      blockGambling: true,
      userSpeedLimitMbps: 10,
    },

    playlist: [
      {
        id: 'tv_b1',
        title: 'Sexta Sertaneja com Zé & Matheus - Chopp em Dobro!',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1920&q=80',
        durationSeconds: 8,
        active: true,
      },
      {
        id: 'tv_b2',
        title: 'Vídeo Institucional Vila Boêmia (Demonstração MP4)',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        muteVideoKeepRadio: false, // Desmarcado: toca áudio do vídeo e muta Rádio. Se marcado (true): muta vídeo e toca Rádio.
        active: true,
      },
    ],
  },

  tenant_barber_02: {
    tenantId: 'tenant_barber_02',
    tenantName: 'Barbearia VIP Club',
    pairingCode: 'TV-3104',
    addonActive: false,
    showQrOverlay: true,
    showClockOverlay: true,
    paymentStatus: 'PENDING',
    autoRenew: false,

    addonStates: {
      'captive-portal': { active: true, paymentStatus: 'PAID' },
      'midia-indoor': { active: false, paymentStatus: 'PENDING' },
      'radio-indoor': { active: false, paymentStatus: 'PENDING' },
      'google-reviews': { active: false, paymentStatus: 'PENDING' },
      'whatsapp-bot': { active: false, paymentStatus: 'PENDING' },
      'roleta-da-sorte': { active: true, paymentStatus: 'PAID', planCycle: 'MENSAL', subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      'loja-produtos': { active: true, paymentStatus: 'PAID', planCycle: 'MENSAL', subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      'web-guard': { active: false, paymentStatus: 'PENDING' },
      'multi-unidades': { active: false, paymentStatus: 'PENDING' },
      'wifi-vip': { active: false, paymentStatus: 'PENDING' },
    },

    radioIndoorConfig: {
      provider: 'youtube',
      playlistUrl: 'https://www.youtube.com/playlist?list=PL4fGSI1pDJn6jWSV0Tz2uWp6h-Zly-gM-',
      playlistName: 'Lofi & Rock Instrumental para Barbearia (YouTube Music)',
      spotIntervalMinutes: 20,
      syncWithSmartTv: true,
      spotMessages: [
        '💈 Agende seu combo Corte + Barba Terapia na recepção!',
        '🍺 Cerveja trincando por conta da casa para clientes VIP.',
      ],
    },

    playlist: [
      {
        id: 'tv_bb1',
        title: 'Corte + Barba Terapia VIP com Cerveja Gelada',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1920&q=80',
        durationSeconds: 10,
        active: true,
      },
    ],
  },
};
