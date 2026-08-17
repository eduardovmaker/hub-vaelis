export interface PortalBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  order: number;
}

export interface PixPlan {
  id: string;
  title: string;
  durationText: string;
  price: number;
  speedLimit: string;
  recommended?: boolean;
}

export type TenantCategory = 'FOOD' | 'BARBER' | 'RETAIL' | 'SERVICES';

export interface TenantPortalConfig {
  tenantId: string;
  tenantName: string;
  tenantCategory: TenantCategory;
  logoUrl?: string;
  primaryColor?: string;
  wifiSsid: string;
  banners: PortalBanner[];
  pixPlans: PixPlan[];
  freeAccessEnabled: boolean;
  freeAccessDurationMinutes: number;
  adWatchSeconds: number;
  // Integração Multitenant com Cardápio / Tabela de Serviços / Catálogo
  digitalMenuEnabled: boolean;
  digitalMenuUrl: string;
  digitalMenuTitle: string;
  digitalMenuButtonText: string;
  digitalMenuIcon: 'utensils' | 'scissors' | 'shopping-bag' | 'sparkles' | 'link';
  autoRedirectToMenu: boolean;
}

export const INITIAL_PORTAL_CONFIGS: Record<string, TenantPortalConfig> = {};
