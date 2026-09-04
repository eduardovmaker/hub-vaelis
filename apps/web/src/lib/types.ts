/**
 * Domínio da plataforma de Mídia Indoor.
 *
 * Vídeos e imagens ficam no Cloudflare R2 e são referenciados pela URL pública.
 * A trilha sonora vem do Spotify, tocada pelo próprio navegador da tela através
 * do Web Playback SDK (requer conta Premium do estabelecimento).
 */

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
}

export type TenantCategory =
  | "BARBEARIA"
  | "RESTAURANTE"
  | "CLINICA"
  | "ACADEMIA"
  | "VAREJO"
  | "OUTRO";

export interface Tenant {
  id: string;
  name: string;
  category: TenantCategory;
  primaryColor: string;
  logoUrl?: string;
  /** IANA timezone usado para relógio na tela e agendamento da playlist. */
  timezone: string;
  contactWhatsapp?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MediaType = "video" | "image";

export interface MediaAsset {
  id: string;
  tenantId: string;
  title: string;
  type: MediaType;
  /** URL pública no Cloudflare R2. */
  url: string;
  /** Chave do objeto no bucket R2, necessária para excluir o arquivo. */
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
  /** Duração real do vídeo, lida no navegador durante o upload. */
  durationSeconds?: number;
  createdAt: string;
}

export interface PlaylistItem {
  id: string;
  /** Referência ao item da biblioteca, quando veio de um upload. */
  assetId?: string;
  title: string;
  type: MediaType;
  url: string;
  /** Imagens usam este valor; vídeos tocam até o fim. */
  durationSeconds: number;
  active: boolean;
  /**
   * Vídeo entra mudo e a música do Spotify continua tocando.
   * Quando false, a música é abaixada e o áudio do vídeo assume.
   */
  muteAudio: boolean;
  order: number;
}

export interface Playlist {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ScreenOverlays {
  showClock: boolean;
  showLogo: boolean;
  showNowPlaying: boolean;
  /** Chamada promocional que aparece periodicamente sobre a mídia. */
  ctaEnabled: boolean;
  ctaTitle: string;
  ctaSubtitle: string;
  /** Vira QR Code na tela quando preenchido (Instagram, cardápio, agendamento). */
  ctaUrl: string;
  ctaIntervalMinutes: number;
  ctaDurationSeconds: number;
}

export const DEFAULT_OVERLAYS: ScreenOverlays = {
  showClock: true,
  showLogo: true,
  showNowPlaying: true,
  ctaEnabled: false,
  ctaTitle: "Siga nosso Instagram",
  ctaSubtitle: "Aponte a câmera do celular e confira as novidades.",
  ctaUrl: "",
  ctaIntervalMinutes: 5,
  ctaDurationSeconds: 15,
};

export type ScreenOrientation = "LANDSCAPE" | "PORTRAIT";

export interface Screen {
  id: string;
  tenantId: string;
  name: string;
  location?: string;
  orientation: ScreenOrientation;
  /** Código de 6 caracteres digitado na TV para vincular o player. */
  pairingCode: string;
  paired: boolean;
  pairedAt?: string;
  /**
   * Segredo entregue à TV no pareamento. A tela o envia em cada chamada para
   * buscar configuração, token do Spotify e reportar presença.
   */
  deviceSecret: string;
  playlistId?: string;
  overlays: ScreenOverlays;
  /** Música do Spotify habilitada nesta tela. */
  musicEnabled: boolean;
  volumePercent: number;
  /** device_id do Web Playback SDK, reportado pela tela ao ficar pronta. */
  spotifyDeviceId?: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpotifyAccount {
  tenantId: string;
  connected: boolean;
  displayName: string;
  /** "premium" é obrigatório para o Web Playback SDK tocar faixas completas. */
  product: string;
  refreshToken: string;
  accessToken: string;
  /** ISO string do vencimento do access token. */
  expiresAt: string;
  /** Contexto tocado por padrão, ex: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M */
  contextUri: string;
  playlistName: string;
  shuffle: boolean;
  updatedAt: string;
}

/** Payload único que a tela busca para se desenhar e tocar. */
export interface ScreenBootstrap {
  screen: Pick<
    Screen,
    | "id"
    | "tenantId"
    | "name"
    | "orientation"
    | "overlays"
    | "musicEnabled"
    | "volumePercent"
  >;
  tenant: Pick<Tenant, "id" | "name" | "primaryColor" | "logoUrl" | "timezone">;
  playlist: PlaylistItem[];
  music: {
    enabled: boolean;
    connected: boolean;
    contextUri: string;
    playlistName: string;
    shuffle: boolean;
  };
}

/** Uma tela é considerada online se reportou presença nos últimos 2 minutos. */
export const SCREEN_ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isScreenOnline(lastSeenAt?: string): boolean {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;
  return Date.now() - seen < SCREEN_ONLINE_WINDOW_MS;
}
