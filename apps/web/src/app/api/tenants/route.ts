import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { INITIAL_TV_CONFIGS, TenantTvConfig } from "@/mocks/tv";

// Helper para timeout ultra rápido em apresentações offline sem travar o app (200ms)
async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 250): Promise<T> {
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
    if (db) {
      const getTenantsPromise = (async () => {
        const snapshot = await db.collection(COLLECTIONS.TENANTS).get();
        if (!snapshot.empty) {
          return snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              tenantId: doc.id,
              tenantName: data.tenantName,
              pairingCode: data.pairingCode,
              paymentStatus: data.paymentStatus || "PAID",
              subscriptionExpiresAt: data.subscriptionExpiresAt,
              addonActive: data.addonStates?.["midia-indoor"]?.active || false,
              addonStates: data.addonStates || {},
            };
          });
        }
        return null;
      })();

      const tenants = await withDbTimeout(getTenantsPromise, 600);
      if (tenants && tenants.length > 0) {
        return NextResponse.json({ success: true, tenants });
      }
    }
  } catch (error: any) {}

  return NextResponse.json({ success: true, tenants: Object.values(memoryTenants) });
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

    const defaultAddonStates = {
      "captive-portal": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
      "midia-indoor": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
      "radio-indoor": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
      "google-reviews": { active: false, paymentStatus: "PENDING" },
      "whatsapp-bot": { active: false, paymentStatus: "PENDING" },
      "roleta-da-sorte": { active: false, paymentStatus: "PENDING" },
      "loja-produtos": { active: false, paymentStatus: "PENDING" },
      "web-guard": { active: false, paymentStatus: "PENDING" },
      "multi-unidades": { active: false, paymentStatus: "PENDING" },
      "wifi-vip": { active: false, paymentStatus: "PENDING" },
    };

    const newTenantConfig: TenantTvConfig = {
      tenantId,
      tenantName,
      pairingCode: finalPairingCode,
      addonActive: true,
      showQrOverlay: true,
      showClockOverlay: true,
      autoRenew: true,
      addonStates: defaultAddonStates as any,
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

    // Salvar na memória para apresentação instantânea
    memoryTenants[tenantId] = newTenantConfig;

    // Provisionar Container MikroTik CHR no Docker
    const { provisionTenantMikrotikChr } = await import("@/lib/docker-mikrotik");
    const chrContainer = await provisionTenantMikrotikChr(tenantId, tenantName);

    // Persistir no Firebase Firestore se disponível
    try {
      if (db) {
        const batch = db.batch();

        const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
        batch.set(tenantRef, {
          tenantName,
          category: category || "FOOD",
          wifiSsid: wifiSsid || `${tenantName}_WiFi`,
          primaryColor: primaryColor || "#2563EB",
          pairingCode: finalPairingCode,
          addonStates: defaultAddonStates,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const tvRef = db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId);
        batch.set(tvRef, newTenantConfig);

        const portalRef = db.collection(COLLECTIONS.PORTAL_CONFIGS).doc(tenantId);
        batch.set(portalRef, {
          tenantId,
          tenantName,
          tenantCategory: category || "FOOD",
          wifiSsid: wifiSsid || `${tenantName}_WiFi`,
          primaryColor: primaryColor || "#2563EB",
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await withDbTimeout(batch.commit(), 350);
      }
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

    // Atualiza na memória para apresentação
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

    // Persiste no Firebase Firestore
    try {
      if (db) {
        const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
        await withDbTimeout(
          tenantRef.set(
            {
              addonStates: {
                [addonId]: {
                  active,
                  paymentStatus: active ? "PAID" : "OVERDUE",
                  planCycle: "MENSAL",
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          ),
          300
        );
      }
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, addonStates, paymentStatus, subscriptionExpiresAt } = body;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId é obrigatório." }, { status: 400 });
    }

    if (memoryTenants[tenantId]) {
      memoryTenants[tenantId] = {
        ...memoryTenants[tenantId],
        ...body,
      };
    }

    if (db) {
      const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (addonStates) updateData.addonStates = addonStates;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (subscriptionExpiresAt) updateData.subscriptionExpiresAt = subscriptionExpiresAt;

      const batch = db.batch();
      const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
      const tvRef = db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId);

      batch.set(tenantRef, updateData, { merge: true });
      batch.set(tvRef, updateData, { merge: true });

      await withDbTimeout(batch.commit(), 500);
    }

    return NextResponse.json({
      success: true,
      message: "Configurações do tenant atualizadas com sucesso no Firestore!",
    });
  } catch (error: any) {
    console.error("Erro na rota PUT /api/tenants:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar tenant." }, { status: 500 });
  }
}
