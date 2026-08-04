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
  tenant_bar_01: {
    tenantId: 'tenant_bar_01',
    tenantName: 'Vila Boêmia Bar & Shows',
    tenantCategory: 'FOOD',
    wifiSsid: 'VilaBoemia_WiFi_Gratis',
    primaryColor: '#2563EB',
    banners: [
      {
        id: 'b1',
        title: 'Sexta Sertaneja com Zé & Matheus',
        subtitle: 'Chopp em dobro até as 21h! Mostre essa tela no bar.',
        imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
        active: true,
        order: 1,
      },
      {
        id: 'b2',
        title: 'Festival de Hambúrguer Artesanal',
        subtitle: 'Experimente nosso Boêmia Burger com batata rústica.',
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
        active: true,
        order: 2,
      },
      {
        id: 'b3',
        title: 'Siga no Instagram @vilaboemiabar',
        subtitle: 'Marque a gente no story e ganhe um shot de cortesia!',
        imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
        active: true,
        order: 3,
      },
    ],
    pixPlans: [
      {
        id: 'p1',
        title: 'Acesso Rápido (2 Horas)',
        durationText: '2 Horas de Wi-Fi',
        price: 5.00,
        speedLimit: '20 Mbps',
      },
      {
        id: 'p2',
        title: 'Passaporte Noite Toda (6 Horas)',
        durationText: '6 Horas de Alta Velocidade',
        price: 10.00,
        speedLimit: '50 Mbps',
        recommended: true,
      },
      {
        id: 'p3',
        title: 'Diária Ilimitada (24h)',
        durationText: '24 Horas sem limites',
        price: 18.00,
        speedLimit: '100 Mbps',
      },
    ],
    freeAccessEnabled: true,
    freeAccessDurationMinutes: 30,
    adWatchSeconds: 15,
    digitalMenuEnabled: true,
    digitalMenuUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    digitalMenuTitle: 'Cardápio Digital & Pedidos',
    digitalMenuButtonText: 'Ver Cardápio & Pedidos na Mesa',
    digitalMenuIcon: 'utensils',
    autoRedirectToMenu: true,
  },
  tenant_barber_02: {
    tenantId: 'tenant_barber_02',
    tenantName: 'Barbearia VIP Club',
    tenantCategory: 'BARBER',
    wifiSsid: 'BarbeariaVIP_Guest',
    primaryColor: '#16A34A',
    banners: [
      {
        id: 'bb1',
        title: 'Combo Barba + Cabelo + Cerveja',
        subtitle: 'Agende seu horário com desconto de 15% de segunda a quarta.',
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
        active: true,
        order: 1,
      },
      {
        id: 'bb2',
        title: 'Linha Premium de Pomadas Matte',
        subtitle: 'Fixação forte e efeito natural. Adquira na recepção.',
        imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80',
        active: true,
        order: 2,
      },
    ],
    pixPlans: [
      {
        id: 'pb1',
        title: 'Wi-Fi VIP 1 Hora',
        durationText: '60 minutos durante seu corte',
        price: 4.00,
        speedLimit: '30 Mbps',
      },
      {
        id: 'pb2',
        title: 'Passe VIP Dia Todo',
        durationText: 'Navegação ultra veloz o dia todo',
        price: 12.00,
        speedLimit: '100 Mbps',
        recommended: true,
      },
    ],
    freeAccessEnabled: true,
    freeAccessDurationMinutes: 20,
    adWatchSeconds: 15,
    digitalMenuEnabled: true,
    digitalMenuUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    digitalMenuTitle: 'Tabela de Serviços & Agendamento',
    digitalMenuButtonText: 'Ver Tabela de Serviços & Agendamento',
    digitalMenuIcon: 'scissors',
    autoRedirectToMenu: false,
  },
};
