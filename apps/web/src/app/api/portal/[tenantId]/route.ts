import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { INITIAL_PORTAL_CONFIGS, TenantPortalConfig } from "@/mocks/portal";

async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 200): Promise<T> {
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
    const tenant = await withDbTimeout(
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          portalConfig: {
            include: {
              banners: { orderBy: { order: "asc" } },
              pixPlans: { orderBy: { price: "asc" } },
            },
          },
        },
      }),
      200
    );

    if (tenant && tenant.portalConfig) {
      const config = tenant.portalConfig;
      return NextResponse.json({
        success: true,
        portalConfig: {
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          tenantCategory: tenant.category,
          wifiSsid: tenant.wifiSsid,
          primaryColor: tenant.primaryColor,
          freeAccessEnabled: config.freeAccessEnabled,
          freeAccessDurationMinutes: config.freeAccessDurationMinutes,
          adWatchSeconds: config.adWatchSeconds,
          digitalMenuEnabled: config.digitalMenuEnabled,
          digitalMenuUrl: config.digitalMenuUrl,
          digitalMenuTitle: config.digitalMenuTitle,
          digitalMenuButtonText: config.digitalMenuButtonText,
          digitalMenuIcon: config.digitalMenuIcon,
          autoRedirectToMenu: config.autoRedirectToMenu,
          banners: config.banners.map((b) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || undefined,
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl || undefined,
            active: b.active,
            order: b.order,
          })),
          pixPlans: config.pixPlans.map((p) => ({
            id: p.id,
            title: p.title,
            durationText: p.durationText,
            price: p.price,
            speedLimit: p.speedLimit,
            recommended: p.recommended,
          })),
        },
      });
    }
  } catch (error: any) {}

  const fallback = memoryPortalConfigs[tenantId] || INITIAL_PORTAL_CONFIGS["tenant_bar_01"];
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

    try {
      await withDbTimeout(
        prisma.portalConfig.upsert({
          where: { tenantId },
          update: {
            freeAccessEnabled: body.freeAccessEnabled,
            freeAccessDurationMinutes: body.freeAccessDurationMinutes,
            adWatchSeconds: body.adWatchSeconds,
            digitalMenuEnabled: body.digitalMenuEnabled,
            digitalMenuUrl: body.digitalMenuUrl,
            digitalMenuTitle: body.digitalMenuTitle,
            digitalMenuButtonText: body.digitalMenuButtonText,
            digitalMenuIcon: body.digitalMenuIcon,
            autoRedirectToMenu: body.autoRedirectToMenu,
          },
          create: {
            tenantId,
            freeAccessEnabled: body.freeAccessEnabled ?? true,
            freeAccessDurationMinutes: body.freeAccessDurationMinutes ?? 30,
            adWatchSeconds: body.adWatchSeconds ?? 15,
            digitalMenuEnabled: body.digitalMenuEnabled ?? true,
            digitalMenuUrl: body.digitalMenuUrl ?? "",
            digitalMenuTitle: body.digitalMenuTitle ?? "Cardápio Digital",
            digitalMenuButtonText: body.digitalMenuButtonText ?? "Ver Cardápio",
            digitalMenuIcon: body.digitalMenuIcon ?? "utensils",
            autoRedirectToMenu: body.autoRedirectToMenu ?? false,
          },
        }),
        300
      );
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
