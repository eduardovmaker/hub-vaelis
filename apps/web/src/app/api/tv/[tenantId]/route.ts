export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { INITIAL_TV_CONFIGS, TenantTvConfig } from "@/mocks/tv";

async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {

  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

const memoryTvConfigs: Record<string, TenantTvConfig> = {};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    if (db) {
      const getTvPromise = (async () => {
        const doc = await db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).get();
        if (doc.exists) {
          return doc.data();
        }
        return null;
      })();

      const config = await withDbTimeout(getTvPromise, 3000);
      if (config) {
        return NextResponse.json({
          success: true,
          tvConfig: {
            tenantId,
            ...config,
            addonActive: (config as any).addonActive ?? true,
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

  const fallback = memoryTvConfigs[tenantId] || {
    tenantId,
    tenantName: readableName || tenantId,
    pairingCode: `TV-${Math.floor(1000 + Math.random() * 9000)}`,
    addonActive: true,
    showQrOverlay: true,
    showClockOverlay: true,
    showRadioBadge: true,
    showTitleOverlay: true,
    showHeaderLogo: true,
    planCycle: "MENSAL",
    paymentStatus: "PAID",
    playlist: [],
    addonStates: {},
  };

  return NextResponse.json({
    success: true,
    tvConfig: fallback,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const currentMemory = memoryTvConfigs[tenantId] || INITIAL_TV_CONFIGS[tenantId] || {
      tenantId,
      tenantName: tenantId,
      pairingCode: `TV-${Math.floor(1000 + Math.random() * 9000)}`,
      addonActive: true,
      showQrOverlay: true,
      showClockOverlay: true,
      playlist: [],
    };
    memoryTvConfigs[tenantId] = {
      ...currentMemory,
      ...body,
    };

    // Persiste no Firebase Firestore
    try {
      if (db) {
        await withDbTimeout(
          db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).set(body, { merge: true }),
          3000
        );
      }
    } catch (dbErr) {}

    return NextResponse.json({
      success: true,
      tvConfig: memoryTvConfigs[tenantId],
      message: "Configurações da Smart TV salvas com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configurações da Smart TV." },
      { status: 500 }
    );
  }
}
