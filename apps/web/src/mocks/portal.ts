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

export const INITIAL_PORTAL_CONFIGS: Record<string, TenantPortalConfig> = {
  tenant_martinelli_barbearia_8598: {
    tenantId: "tenant_martinelli_barbearia_8598",
    tenantName: "Martinelli Barbearia",
    tenantCategory: "BARBER",
    wifiSsid: "Martinelli_Barbearia_VIP",
    primaryColor: "#2563EB",
    banners: [
      {
        id: "b_martinelli_1",
        title: "Seja Bem-vindo à Martinelli Barbearia!",
        subtitle: "Corte, barba e cerveja trincando. Conecte-se ao nosso Wi-Fi de alta velocidade.",
        imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
        active: true,
        order: 1,
      },
    ],
    pixPlans: [
      { id: "p1_martinelli", title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi", price: 5.0, speedLimit: "20 Mbps" },
      { id: "p2_martinelli", title: "Passaporte Dia Todo (6 Horas)", durationText: "6 Horas de Alta Velocidade", price: 10.0, speedLimit: "50 Mbps", recommended: true },
    ],
    freeAccessEnabled: true,
    freeAccessDurationMinutes: 30,
    adWatchSeconds: 15,
    digitalMenuEnabled: true,
    digitalMenuUrl: "",
    digitalMenuTitle: "Serviços Barbearia",
    digitalMenuButtonText: "Ver Tabela de Cortes & Barba",
    digitalMenuIcon: "scissors",
    autoRedirectToMenu: false,
  },
};
