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

  const cleanUrl = url.trim();
  if (cleanUrl.includes("open.spotify.com/embed/")) {
    const [base] = cleanUrl.split("?");
    return `${base}?utm_source=generator&theme=0`;
  }

  // Suporte a URI oficial do Spotify (ex: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M)
  if (cleanUrl.startsWith("spotify:")) {
    const parts = cleanUrl.split(":");
    if (parts.length >= 3) {
      const type = parts[1]; // playlist | album | track | artist
      const id = parts[2];
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
  }

  try {
    const parsed = new URL(cleanUrl);
    // Remove prefixos regionais como /intl-pt/ ou /intl-es/
    let pathname = parsed.pathname.replace(/^\/intl-[a-z]{2}(-[a-zA-Z]{2,4})?/, "");
    if (!pathname.startsWith("/")) pathname = "/" + pathname;

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

export const INITIAL_TV_CONFIGS: Record<string, TenantTvConfig> = {};
