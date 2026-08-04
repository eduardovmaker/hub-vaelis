import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o Seed do Banco de Dados PostgreSQL do CaptiveHub...");

  // Limpeza prévia para QA
  await prisma.user.deleteMany({});
  await prisma.addonState.deleteMany({});
  await prisma.portalBanner.deleteMany({});
  await prisma.pixPlan.deleteMany({});
  await prisma.portalConfig.deleteMany({});
  await prisma.tvMediaItem.deleteMany({});
  await prisma.tvConfig.deleteMany({});
  await prisma.radioIndoorConfig.deleteMany({});
  await prisma.googleReviewsConfig.deleteMany({});
  await prisma.whatsappBotConfig.deleteMany({});
  await prisma.roletaSorteConfig.deleteMany({});
  await prisma.webGuardConfig.deleteMany({});
  await prisma.tenant.deleteMany({});

  // Hashes das Senhas
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const barPasswordHash = await bcrypt.hash("bar123", 10);
  const barberPasswordHash = await bcrypt.hash("barber123", 10);

  // 1. Criar Super Admin
  await prisma.user.create({
    data: {
      id: "user_master_admin",
      email: "admin@captivehub.local",
      name: "Super Admin Captive Hub",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });

  // 2. Tenant 01 - Vila Boêmia Bar & Shows
  const tenant1 = await prisma.tenant.create({
    data: {
      id: "tenant_bar_01",
      tenantName: "Vila Boêmia Bar & Shows",
      category: "FOOD",
      wifiSsid: "VilaBoemia_WiFi_Gratis",
      primaryColor: "#2563EB",
      pairingCode: "TV-8492",
    },
  });

  await prisma.user.create({
    data: {
      id: "user_tenant_01",
      email: "contato@vilaboemia.com.br",
      name: "Vila Boêmia Bar & Shows",
      passwordHash: barPasswordHash,
      role: "TENANT_ADMIN",
      tenantId: tenant1.id,
    },
  });

  // Addons do Tenant 01
  const expires30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const addonIds = ["midia-indoor", "radio-indoor", "google-reviews", "whatsapp-bot", "roleta-da-sorte", "web-guard", "multi-unidades"];

  for (const addonId of addonIds) {
    const isActive = ["midia-indoor", "radio-indoor", "google-reviews", "roleta-da-sorte"].includes(addonId);
    await prisma.addonState.create({
      data: {
        tenantId: tenant1.id,
        addonId,
        active: isActive,
        paymentStatus: isActive ? "PAID" : "PENDING",
        planCycle: "MENSAL",
        subscriptionExpiresAt: isActive ? expires30Days : null,
        asaasPaymentId: isActive ? `pay_asaas_8492_${addonId}` : null,
      },
    });
  }

  // Portal Config Tenant 01
  const portal1 = await prisma.portalConfig.create({
    data: {
      tenantId: tenant1.id,
      freeAccessEnabled: true,
      freeAccessDurationMinutes: 30,
      adWatchSeconds: 15,
      digitalMenuEnabled: true,
      digitalMenuUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
      digitalMenuTitle: "Cardápio Digital & Pedidos",
      digitalMenuButtonText: "Ver Cardápio & Pedidos na Mesa",
      digitalMenuIcon: "utensils",
      autoRedirectToMenu: true,
    },
  });

  await prisma.portalBanner.createMany({
    data: [
      {
        portalConfigId: portal1.id,
        title: "Sexta Sertaneja com Zé & Matheus",
        subtitle: "Chopp em dobro até as 21h! Mostre essa tela no bar.",
        imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
        active: true,
        order: 1,
      },
      {
        portalConfigId: portal1.id,
        title: "Festival de Hambúrguer Artesanal",
        subtitle: "Experimente nosso Boêmia Burger com batata rústica.",
        imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
        active: true,
        order: 2,
      },
    ],
  });

  await prisma.pixPlan.createMany({
    data: [
      { portalConfigId: portal1.id, title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi", price: 5.0, speedLimit: "20 Mbps" },
      { portalConfigId: portal1.id, title: "Passaporte Noite Toda (6 Horas)", durationText: "6 Horas de Alta Velocidade", price: 10.0, speedLimit: "50 Mbps", recommended: true },
      { portalConfigId: portal1.id, title: "Diária Ilimitada (24h)", durationText: "24 Horas sem limites", price: 18.0, speedLimit: "100 Mbps" },
    ],
  });

  // TV Config Tenant 01
  const tv1 = await prisma.tvConfig.create({
    data: {
      tenantId: tenant1.id,
      showQrOverlay: true,
      showClockOverlay: true,
      autoRenew: true,
    },
  });

  await prisma.tvMediaItem.createMany({
    data: [
      {
        tvConfigId: tv1.id,
        title: "Sexta Sertaneja com Zé & Matheus - Chopp em Dobro!",
        type: "image",
        url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1920&q=80",
        durationSeconds: 8,
        active: true,
        order: 1,
      },
      {
        tvConfigId: tv1.id,
        title: "Vídeo Institucional Vila Boêmia (Demonstração MP4)",
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        durationSeconds: 15,
        muteVideoKeepRadio: false,
        active: true,
        order: 2,
      },
    ],
  });

  await prisma.radioIndoorConfig.create({
    data: {
      tenantId: tenant1.id,
      provider: "spotify",
      playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      playlistName: "Hits da Boêmia & Sertanejo (Sua Playlist Spotify)",
      spotIntervalMinutes: 15,
      syncWithSmartTv: true,
      spotMessages: JSON.stringify([
        "📢 Chopp em Dobro no Bar até às 21h! Peça pelo cardápio digital.",
        "📸 Posta um story no Instagram e marca @vilaboemiabar para ganhar um shot de cortesia!",
        "🍟 Experimente nosso Hambúrguer Artesanal com batata rústica.",
      ]),
    },
  });

  await prisma.googleReviewsConfig.create({
    data: {
      tenantId: tenant1.id,
      googleMapsUrl: "https://maps.google.com/?cid=123456789",
      minRatingForGoogle: 4,
      managerWhatsapp: "5511999887766",
    },
  });

  await prisma.whatsappBotConfig.create({
    data: {
      tenantId: tenant1.id,
      otpType: "whatsapp",
      welcomeMessage: "Bem-vindo ao Vila Boêmia Bar! Aproveite seu Wi-Fi Grátis.",
      capturedLeadsCount: 342,
    },
  });

  await prisma.roletaSorteConfig.create({
    data: {
      tenantId: tenant1.id,
      prizes: JSON.stringify([
        { id: "rz1", name: "10% de Desconto na Conta", chancePercent: 30 },
        { id: "rz2", name: "Shot de Cortesia no Bar", chancePercent: 20 },
        { id: "rz3", name: "Batata Rústica Grátis", chancePercent: 10 },
        { id: "rz4", name: "Tente Novamente", chancePercent: 40 },
      ]),
    },
  });

  await prisma.webGuardConfig.create({
    data: {
      tenantId: tenant1.id,
      blockAdultContent: true,
      blockTorrents: true,
      blockGambling: true,
      userSpeedLimitMbps: 10,
    },
  });

  // 3. Tenant 02 - Barbearia VIP Club
  const tenant2 = await prisma.tenant.create({
    data: {
      id: "tenant_barber_02",
      tenantName: "Barbearia VIP Club",
      category: "BARBER",
      wifiSsid: "BarbeariaVIP_Guest",
      primaryColor: "#16A34A",
      pairingCode: "TV-3104",
    },
  });

  await prisma.user.create({
    data: {
      id: "user_tenant_02",
      email: "gerente@barbeariavip.com",
      name: "Barbearia VIP Club",
      passwordHash: barberPasswordHash,
      role: "TENANT_ADMIN",
      tenantId: tenant2.id,
    },
  });

  for (const addonId of addonIds) {
    await prisma.addonState.create({
      data: {
        tenantId: tenant2.id,
        addonId,
        active: false,
        paymentStatus: "PENDING",
      },
    });
  }

  const portal2 = await prisma.portalConfig.create({
    data: {
      tenantId: tenant2.id,
      freeAccessEnabled: true,
      freeAccessDurationMinutes: 20,
      adWatchSeconds: 15,
      digitalMenuEnabled: true,
      digitalMenuUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
      digitalMenuTitle: "Tabela de Serviços & Agendamento",
      digitalMenuButtonText: "Ver Tabela de Serviços & Agendamento",
      digitalMenuIcon: "scissors",
      autoRedirectToMenu: false,
    },
  });

  await prisma.portalBanner.createMany({
    data: [
      {
        portalConfigId: portal2.id,
        title: "Combo Barba + Cabelo + Cerveja",
        subtitle: "Agende seu horário com desconto de 15% de segunda a quarta.",
        imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
        active: true,
        order: 1,
      },
    ],
  });

  await prisma.pixPlan.createMany({
    data: [
      { portalConfigId: portal2.id, title: "Wi-Fi VIP 1 Hora", durationText: "60 minutos durante seu corte", price: 4.0, speedLimit: "30 Mbps" },
      { portalConfigId: portal2.id, title: "Passe VIP Dia Todo", durationText: "Navegação ultra veloz o dia todo", price: 12.0, speedLimit: "100 Mbps", recommended: true },
    ],
  });

  const tv2 = await prisma.tvConfig.create({
    data: {
      tenantId: tenant2.id,
      showQrOverlay: true,
      showClockOverlay: true,
      autoRenew: false,
    },
  });

  await prisma.tvMediaItem.create({
    data: {
      tvConfigId: tv2.id,
      title: "Corte + Barba Terapia VIP com Cerveja Gelada",
      type: "image",
      url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1920&q=80",
      durationSeconds: 10,
      active: true,
      order: 1,
    },
  });

  await prisma.radioIndoorConfig.create({
    data: {
      tenantId: tenant2.id,
      provider: "youtube",
      playlistUrl: "https://www.youtube.com/playlist?list=PL4fGSI1pDJn6jWSV0Tz2uWp6h-Zly-gM-",
      playlistName: "Lofi & Rock Instrumental para Barbearia (YouTube Music)",
      spotIntervalMinutes: 20,
      syncWithSmartTv: true,
      spotMessages: JSON.stringify([
        "💈 Agende seu combo Corte + Barba Terapia na recepção!",
        "🍺 Cerveja trincando por conta da casa para clientes VIP.",
      ]),
    },
  });

  console.log("✅ Seed concluído com sucesso no PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed do banco de dados:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
