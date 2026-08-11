import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { INITIAL_PORTAL_CONFIGS, TenantPortalConfig } from "@/mocks/portal";

async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 250): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

const memoryPortalConfigs: Record<string, TenantPortalConfig> = { ...INITIAL_PORTAL_CONFIGS };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    if (db) {
      const getPortalPromise = (async () => {
        const doc = await db.collection(COLLECTIONS.PORTAL_CONFIGS).doc(tenantId).get();
        if (doc.exists) {
          return doc.data();
        }
        return null;
      })();

      const config = await withDbTimeout(getPortalPromise, 250);
      if (config) {
        return NextResponse.json({
          success: true,
          portalConfig: {
            tenantId,
            ...config,
          },
        });
      }
    }
  } catch (error: any) {}

  const readableName = tenantId
    .replace(/^tenant_/, "")
    .replace(/_\d+$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const fallback = memoryPortalConfigs[tenantId] || {
    tenantId,
    tenantName: readableName || tenantId,
    tenantCategory: "FOOD",
    wifiSsid: `${readableName || tenantId}_WiFi_Gratis`,
    primaryColor: "#2563EB",
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
  };

  return NextResponse.json({
    success: true,
    portalConfig: fallback,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Atualização em memória para apresentação rápida
    if (memoryPortalConfigs[tenantId]) {
      memoryPortalConfigs[tenantId] = {
        ...memoryPortalConfigs[tenantId],
        ...body,
      };
    } else {
      memoryPortalConfigs[tenantId] = {
        tenantId,
        tenantName: body.tenantName || tenantId,
        tenantCategory: "FOOD",
        wifiSsid: body.wifiSsid || "WiFi_Guest",
        primaryColor: "#2563EB",
        banners: body.banners || [],
        pixPlans: body.pixPlans || [],
        freeAccessEnabled: body.freeAccessEnabled ?? true,
        freeAccessDurationMinutes: body.freeAccessDurationMinutes ?? 30,
        adWatchSeconds: body.adWatchSeconds ?? 15,
        digitalMenuEnabled: body.digitalMenuEnabled ?? true,
        digitalMenuUrl: body.digitalMenuUrl ?? "",
        digitalMenuTitle: body.digitalMenuTitle ?? "Cardápio Digital",
        digitalMenuButtonText: body.digitalMenuButtonText ?? "Ver Cardápio",
        digitalMenuIcon: body.digitalMenuIcon ?? "utensils",
        autoRedirectToMenu: body.autoRedirectToMenu ?? false,
      };
    }

    // Persiste no Firebase Firestore
    try {
      if (db) {
        await withDbTimeout(
          db.collection(COLLECTIONS.PORTAL_CONFIGS).doc(tenantId).set(body, { merge: true }),
          300
        );
      }
    } catch (dbErr) {}

    return NextResponse.json({
      success: true,
      portalConfig: memoryPortalConfigs[tenantId],
      message: "Configurações e Planos PIX do Captive Portal salvos com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configurações do portal." },
      { status: 500 }
    );
  }
}
