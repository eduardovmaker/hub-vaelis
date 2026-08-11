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
              addonActive: data.addonStates?.["midia-indoor"]?.active || false,
              addonStates: data.addonStates || {},
            };
          });
        }
        return null;
      })();

      const tenants = await withDbTimeout(getTenantsPromise, 250);
      if (tenants && tenants.length > 0) {
        return NextResponse.json({ success: true, tenants });
      }
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

    const defaultAddonStates = {
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
    };

    const newTenantConfig: TenantTvConfig = {
      tenantId,
      tenantName,
      pairingCode: finalPairingCode,
      addonActive: false,
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
        await withDbTimeout(
          db.collection(COLLECTIONS.TENANTS).doc(tenantId).set({
            tenantName,
            category: category || "FOOD",
            wifiSsid: wifiSsid || `${tenantName}_WiFi`,
            primaryColor: primaryColor || "#2563EB",
            pairingCode: finalPairingCode,
            addonStates: defaultAddonStates,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          300
        );
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
            { merge: true }
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
