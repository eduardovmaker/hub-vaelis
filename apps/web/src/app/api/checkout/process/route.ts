import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { INITIAL_TV_CONFIGS, TenantTvConfig } from "@/mocks/tv";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";

// Helper para timeout rápido de banco (200ms) para não travar modo apresentação
async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 200): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, category, wifiSsid, primaryColor } = body;

    if (!email || !password || !companyName) {
      return NextResponse.json(
        { success: false, error: "Preencha todos os campos obrigatórios (E-mail, Senha e Empresa)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const slugName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const tenantId = `tenant_${slugName}_${Date.now().toString().slice(-4)}`;
    const pairingCode = `TV-${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const expires30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Estrutura de dados do novo tenant
    const newTenantConfig: TenantTvConfig = {
      tenantId,
      tenantName: companyName,
      pairingCode,
      addonActive: false,
      showQrOverlay: true,
      showClockOverlay: true,
      autoRenew: true,
      addonStates: {
        "captive-portal": { active: true, paymentStatus: "PAID", subscriptionExpiresAt: expires30Days.toISOString() },
        "midia-indoor": { active: false, paymentStatus: "PENDING" },
        "radio-indoor": { active: false, paymentStatus: "PENDING" },
        "google-reviews": { active: false, paymentStatus: "PENDING" },
        "whatsapp-bot": { active: false, paymentStatus: "PENDING" },
        "roleta-da-sorte": { active: false, paymentStatus: "PENDING" },
        "loja-produtos": { active: false, paymentStatus: "PENDING" },
        "web-guard": { active: false, paymentStatus: "PENDING" },
        "multi-unidades": { active: false, paymentStatus: "PENDING" },
        "wifi-vip": { active: false, paymentStatus: "PENDING" },
      },
      playlist: [
        {
          id: `tv_${tenantId}_1`,
          title: `Boas-vindas ao ${companyName}`,
          type: "image",
          url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80",
          durationSeconds: 10,
          active: true,
        },
      ],
    };

    // Registrar no fallback de memória
    INITIAL_TV_CONFIGS[tenantId] = newTenantConfig;
    INITIAL_PORTAL_CONFIGS[tenantId] = {
      tenantId,
      tenantName: companyName,
      tenantCategory: (category as any) || "FOOD",
      wifiSsid: wifiSsid || `${companyName}_WiFi_Gratis`,
      primaryColor: primaryColor || "#2563EB",
      banners: [
        {
          id: `b_${tenantId}_1`,
          title: `Seja Bem-Vindo ao ${companyName}!`,
          subtitle: "Conecte-se e aproveite nossa rede de alta velocidade.",
          imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
          active: true,
          order: 1,
        },
      ],
      pixPlans: [
        { id: `p1_${tenantId}`, title: "Acesso Rápido (2 Horas)", durationText: "2 Horas de Wi-Fi", price: 5.0, speedLimit: "20 Mbps" },
        { id: `p2_${tenantId}`, title: "Passaporte Dia Todo (6 Horas)", durationText: "6 Horas de Alta Velocidade", price: 10.0, speedLimit: "50 Mbps", recommended: true },
        { id: `p3_${tenantId}`, title: "Diária Sem Limites (24h)", durationText: "24 Horas sem limites", price: 18.0, speedLimit: "100 Mbps" },
      ],
      freeAccessEnabled: true,
      freeAccessDurationMinutes: 30,
      adWatchSeconds: 15,
      digitalMenuEnabled: false,
      digitalMenuUrl: "",
      digitalMenuTitle: "Cardápio Digital",
      digitalMenuButtonText: "Ver Cardápio",
      digitalMenuIcon: "utensils",
      autoRedirectToMenu: false,
    };

    // Tentar persistir no PostgreSQL se o banco estiver rodando
    try {
      await withDbTimeout(
        prisma.$transaction(async (tx) => {
          const createdTenant = await tx.tenant.create({
            data: {
              id: tenantId,
              tenantName: companyName,
              category: (category as any) || "FOOD",
              wifiSsid: wifiSsid || `${companyName}_WiFi_Gratis`,
              primaryColor: primaryColor || "#2563EB",
              pairingCode,
            },
          });

          await tx.user.create({
            data: {
              email: cleanEmail,
              name: name || companyName,
              passwordHash,
              role: "TENANT_ADMIN",
              tenantId: createdTenant.id,
            },
          });

          await tx.addonState.create({
            data: {
              tenantId: createdTenant.id,
              addonId: "captive-portal",
              active: true,
              paymentStatus: "PAID",
              planCycle: "MENSAL",
              subscriptionExpiresAt: expires30Days,
              asaasPaymentId: `pay_checkout_${Date.now()}`,
            },
          });

          await tx.portalConfig.create({
            data: {
              tenantId: createdTenant.id,
              freeAccessEnabled: true,
              freeAccessDurationMinutes: 30,
              adWatchSeconds: 15,
            },
          });
        }),
        300
      );
    } catch (dbErr) {
      console.warn("Aviso: PostgreSQL offline ao processar checkout. Cadastro efetuado com sucesso em memória.");
    }

    const userPayload = {
      id: `user_${tenantId}`,
      name: name || companyName,
      email: cleanEmail,
      role: "TENANT_ADMIN" as const,
      tenantId,
      tenantName: companyName,
    };

    // Provisionar Container MikroTik CHR no Docker para o novo Tenant
    const { provisionTenantMikrotikChr } = await import("@/lib/docker-mikrotik");
    const chrContainer = await provisionTenantMikrotikChr(tenantId, companyName);

    // Script MikroTik RouterOS v7 pré-gerado para o cliente colar no terminal
    const mikrotikScript = `# =========================================================
# SCRIPT DE CONFIGURAÇÃO AUTOMÁTICA CAPTIVEHUB ROS v7
# CLIENTE: ${companyName.toUpperCase()}
# TENANT ID: ${tenantId}
# =========================================================

/interface bridge add name=bridge-hotspot
/ip address add address=192.168.88.1/24 interface=bridge-hotspot
/ip pool add name=hs-pool-1 ranges=192.168.88.10-192.168.88.254
/ip dhcp-server add name=dhcp-hs interface=bridge-hotspot address-pool=hs-pool-1 disabled=no
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=1.1.1.1,8.8.8.8

/ip hotspot profile
add name="hsprof-captivehub" hotspot-address=192.168.88.1 html-directory=hotspot login-by=http-chap,http-pap,cookie use-radius=yes

/ip hotspot add name="hs-captivehub" interface=bridge-hotspot profile=hsprof-captivehub address-pool=hs-pool-1 disabled=no

/radius
add service=hotspot address=127.0.0.1 secret="captivehub-radius-secret" comment="HubLocal RADIUS Cloud"

/ip hotspot walled-garden
add comment="HubLocal Cloud Domain" dst-host="*.captivehub.com.br"
add comment="HubLocal Local Dev" dst-host="*.ngrok-free.app"
add comment="Asaas Payment Gateway" dst-host="*.asaas.com"
`;

    // Integrar com o Gateway Asaas para Geração do Pix e QR Code
    const { createOrGetAsaasCustomer, createAsaasPixPayment, createAsaasPaymentLink } = await import("@/lib/asaas");
    
    const asaasCustomer = await createOrGetAsaasCustomer({
      name: name || companyName,
      email: cleanEmail,
    });

    const paymentAmount = body.planCycle === "ANUAL" ? 890.00 : 99.00;
    const planLabel = body.planCycle === "ANUAL" ? "Anual (R$ 890,00)" : "Mensal (R$ 99,00)";

    const asaasPayment = await createAsaasPixPayment({
      customerId: asaasCustomer.id,
      value: paymentAmount,
      description: `HubLocal - Assinatura Plano ${planLabel} para ${companyName}`,
      externalReference: tenantId,
    });

    const asaasPaymentLink = await createAsaasPaymentLink({
      name: `Assinatura HubLocal - ${companyName}`,
      description: `Plano ${planLabel}`,
      value: paymentAmount,
    });

    return NextResponse.json({
      success: true,
      tenantId,
      user: userPayload,
      mikrotikScript,
      chrContainer,
      asaas: {
        customerId: asaasCustomer.id,
        paymentId: asaasPayment.id,
        status: asaasPayment.status,
        invoiceUrl: asaasPayment.invoiceUrl,
        paymentLinkUrl: asaasPaymentLink.url,
        pixQrCodeImage: asaasPayment.pixQrCode?.encodedImage || "",
        pixCopyPaste: asaasPayment.pixQrCode?.payload || "",
        expiresAt: asaasPayment.pixQrCode?.expirationDate || "",
      },
    });
  } catch (err: any) {
    console.error("Erro ao processar checkout:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro interno no servidor de checkout." },
      { status: 500 }
    );
  }
}
