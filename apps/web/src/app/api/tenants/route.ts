import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { INITIAL_TV_CONFIGS, TenantTvConfig } from "@/mocks/tv";
import { INITIAL_PORTAL_CONFIGS } from "@/mocks/portal";

// Helper para timeout ultra rápido em apresentações offline sem travar o app (200ms)
async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 200): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// In-memory fallback para novos tenants criados no modo apresentação sem banco
const memoryTenants: Record<string, TenantTvConfig> = { ...INITIAL_TV_CONFIGS };

export async function GET() {
  try {
    const dbPromise = prisma.tenant.findMany({
      include: {
        addonStates: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const tenants = await withDbTimeout(dbPromise, 200);

    if (tenants && tenants.length > 0) {
      const formatted = tenants.map((t) => {
        const addonStatesMap: Record<string, any> = {};
        t.addonStates.forEach((s) => {
          addonStatesMap[s.addonId] = {
            active: s.active,
            subscriptionExpiresAt: s.subscriptionExpiresAt?.toISOString(),
            planCycle: s.planCycle || "MENSAL",
            paymentStatus: s.paymentStatus || "PENDING",
            asaasPaymentId: s.asaasPaymentId || undefined,
          };
        });

        return {
          tenantId: t.id,
          tenantName: t.tenantName,
          pairingCode: t.pairingCode,
          addonActive: addonStatesMap["midia-indoor"]?.active || false,
          addonStates: addonStatesMap,
        };
      });

      return NextResponse.json({ success: true, tenants: formatted });
    }
  } catch (error: any) {
    // Retorno de alta velocidade para apresentações off-line
  }

  const fallbackList = Object.values(memoryTenants);
  return NextResponse.json({ success: true, tenants: fallbackList });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantName, category, wifiSsid, primaryColor, pairingCode } = body;

    if (!tenantName) {
      return NextResponse.json(
        { success: false, error: "Nome do estabelecimento é obrigatório." },
        { status: 400 }
      );
    }

    const tenantId = `tenant_${tenantName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`;
    const finalPairingCode = pairingCode || `TV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTenantConfig: TenantTvConfig = {
      tenantId,
      tenantName,
      pairingCode: finalPairingCode,
      addonActive: false,
      showQrOverlay: true,
      showClockOverlay: true,
      autoRenew: true,
      addonStates: {
        "captive-portal": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
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
          title: `Boas-vindas ao ${tenantName}`,
          type: "image",
          url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80",
          durationSeconds: 10,
          active: true,
        },
      ],
    };

    // Salvar na memória para apresentação
    memoryTenants[tenantId] = newTenantConfig;

    // Provisionar Container MikroTik CHR no Docker
    const { provisionTenantMikrotikChr } = await import("@/lib/docker-mikrotik");
    const chrContainer = await provisionTenantMikrotikChr(tenantId, tenantName);

    // Tentar persistir no PostgreSQL se o banco estiver rodando
    try {
      await withDbTimeout(
        prisma.tenant.create({
          data: {
            id: tenantId,
            tenantName,
            category: category || "FOOD",
            wifiSsid: wifiSsid || `${tenantName}_WiFi`,
            primaryColor: primaryColor || "#2563EB",
            pairingCode: finalPairingCode,
            addonStates: {
              create: [
                { addonId: "captive-portal", active: true, paymentStatus: "PAID" },
                { addonId: "midia-indoor", active: false, paymentStatus: "PENDING" },
                { addonId: "radio-indoor", active: false, paymentStatus: "PENDING" },
                { addonId: "google-reviews", active: false, paymentStatus: "PENDING" },
                { addonId: "whatsapp-bot", active: false, paymentStatus: "PENDING" },
                { addonId: "roleta-da-sorte", active: false, paymentStatus: "PENDING" },
                { addonId: "web-guard", active: false, paymentStatus: "PENDING" },
                { addonId: "multi-unidades", active: false, paymentStatus: "PENDING" },
              ],
            },
          },
        }),
        300
      );
    } catch (e) {}

    return NextResponse.json({
      success: true,
      tenant: newTenantConfig,
      chrContainer,
      message: "Tenant criado e Container MikroTik CHR Docker provisionado com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao cadastrar novo tenant." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, addonId, active } = body;

    if (!tenantId || !addonId || typeof active !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'tenantId', 'addonId' e 'active' são obrigatórios." },
        { status: 400 }
      );
    }

    // Atualiza na memória para a apresentação
    if (memoryTenants[tenantId]) {
      if (!memoryTenants[tenantId].addonStates) {
        memoryTenants[tenantId].addonStates = {} as any;
      }
      (memoryTenants[tenantId].addonStates as Record<string, any>)[addonId] = {
        active,
        paymentStatus: active ? "PAID" : "OVERDUE",
        planCycle: "MENSAL",
      };
    }

    const expiresAt = active
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date();

    try {
      await withDbTimeout(
        prisma.addonState.upsert({
          where: {
            tenantId_addonId: {
              tenantId,
              addonId,
            },
          },
          update: {
            active,
            paymentStatus: active ? "PAID" : "OVERDUE",
            subscriptionExpiresAt: expiresAt,
          },
          create: {
            tenantId,
            addonId,
            active,
            paymentStatus: active ? "PAID" : "OVERDUE",
            subscriptionExpiresAt: expiresAt,
            planCycle: "MENSAL",
            asaasPaymentId: `pay_asaas_${Date.now()}`,
          },
        }),
        300
      );
    } catch (dbErr) {}

    return NextResponse.json({
      success: true,
      message: `Add-on [${addonId}] atualizado para ${active ? "LIBERADO" : "BLOQUEADO"}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar status do add-on." },
      { status: 500 }
    );
  }
}
