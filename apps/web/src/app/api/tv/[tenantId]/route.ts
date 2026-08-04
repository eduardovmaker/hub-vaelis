import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { INITIAL_TV_CONFIGS, TenantTvConfig } from "@/mocks/tv";

async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 200): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

const memoryTvConfigs: Record<string, TenantTvConfig> = { ...INITIAL_TV_CONFIGS };

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
          addonStates: true,
          tvConfig: {
            include: {
              playlist: { orderBy: { order: "asc" } },
            },
          },
          radioIndoorConfig: true,
          googleReviewsConfig: true,
          whatsappBotConfig: true,
          roletaSorteConfig: true,
          webGuardConfig: true,
        },
      }),
      200
    );

    if (tenant) {
      const addonStatesMap: Record<string, any> = {};
      tenant.addonStates.forEach((s) => {
        addonStatesMap[s.addonId] = {
          active: s.active,
          subscriptionExpiresAt: s.subscriptionExpiresAt?.toISOString(),
          planCycle: s.planCycle || "MENSAL",
          paymentStatus: s.paymentStatus || "PENDING",
          asaasPaymentId: s.asaasPaymentId || undefined,
        };
      });

      let spotMessagesList: string[] = [];
      if (tenant.radioIndoorConfig?.spotMessages) {
        try {
          spotMessagesList = JSON.parse(tenant.radioIndoorConfig.spotMessages);
        } catch (e) {}
      }

      let prizesList: any[] = [];
      if (tenant.roletaSorteConfig?.prizes) {
        try {
          prizesList = JSON.parse(tenant.roletaSorteConfig.prizes);
        } catch (e) {}
      }

      return NextResponse.json({
        success: true,
        tvConfig: {
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          pairingCode: tenant.pairingCode,
          addonActive: addonStatesMap["midia-indoor"]?.active || false,
          showQrOverlay: tenant.tvConfig?.showQrOverlay ?? true,
          showClockOverlay: tenant.tvConfig?.showClockOverlay ?? true,
          showRadioBadge: tenant.tvConfig?.showRadioBadge ?? true,
          showTitleOverlay: tenant.tvConfig?.showTitleOverlay ?? true,
          customCtaEnabled: tenant.tvConfig?.customCtaEnabled ?? false,
          customCtaTitle: tenant.tvConfig?.customCtaTitle ?? "Siga nosso Instagram!",
          customCtaSubtitle: tenant.tvConfig?.customCtaSubtitle ?? "Aponte a câmera do celular para conferir novidades e promoções.",
          customCtaUrl: tenant.tvConfig?.customCtaUrl ?? "https://instagram.com",
          customCtaIntervalMinutes: tenant.tvConfig?.customCtaIntervalMinutes ?? 5,
          customCtaDurationSeconds: tenant.tvConfig?.customCtaDurationSeconds ?? 15,
          autoRenew: tenant.tvConfig?.autoRenew ?? true,
          addonStates: addonStatesMap,
          playlist: tenant.tvConfig?.playlist.map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            url: p.url,
            durationSeconds: p.durationSeconds,
            active: p.active,
            muteVideoKeepRadio: p.muteVideoKeepRadio,
          })) || [],
          radioIndoorConfig: tenant.radioIndoorConfig
            ? {
                provider: tenant.radioIndoorConfig.provider,
                playlistUrl: tenant.radioIndoorConfig.playlistUrl,
                playlistName: tenant.radioIndoorConfig.playlistName,
                spotIntervalMinutes: tenant.radioIndoorConfig.spotIntervalMinutes,
                syncWithSmartTv: tenant.radioIndoorConfig.syncWithSmartTv,
                spotMessages: spotMessagesList,
              }
            : undefined,
          googleReviewsConfig: tenant.googleReviewsConfig
            ? {
                googleMapsUrl: tenant.googleReviewsConfig.googleMapsUrl,
                minRatingForGoogle: tenant.googleReviewsConfig.minRatingForGoogle,
                managerWhatsapp: tenant.googleReviewsConfig.managerWhatsapp,
              }
            : undefined,
          whatsappBotConfig: tenant.whatsappBotConfig
            ? {
                otpType: tenant.whatsappBotConfig.otpType,
                welcomeMessage: tenant.whatsappBotConfig.welcomeMessage,
                capturedLeadsCount: tenant.whatsappBotConfig.capturedLeadsCount,
              }
            : undefined,
          roletaSorteConfig: tenant.roletaSorteConfig
            ? {
                prizes: prizesList,
              }
            : undefined,
          webGuardConfig: tenant.webGuardConfig
            ? {
                blockAdultContent: tenant.webGuardConfig.blockAdultContent,
                blockTorrents: tenant.webGuardConfig.blockTorrents,
                blockGambling: tenant.webGuardConfig.blockGambling,
                userSpeedLimitMbps: tenant.webGuardConfig.userSpeedLimitMbps,
              }
            : undefined,
        },
      });
    }
  } catch (error: any) {}

  const fallback = memoryTvConfigs[tenantId] || INITIAL_TV_CONFIGS[tenantId] || INITIAL_TV_CONFIGS["tenant_bar_01"];
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

    const currentMemory = memoryTvConfigs[tenantId] || INITIAL_TV_CONFIGS[tenantId] || INITIAL_TV_CONFIGS["tenant_bar_01"];
    memoryTvConfigs[tenantId] = {
      ...currentMemory,
      ...body,
    };

    try {
      if (
        body.showQrOverlay !== undefined ||
        body.showClockOverlay !== undefined ||
        body.showRadioBadge !== undefined ||
        body.showTitleOverlay !== undefined ||
        body.customCtaEnabled !== undefined
      ) {
        await withDbTimeout(
          prisma.tvConfig.upsert({
            where: { tenantId },
            update: {
              showQrOverlay: body.showQrOverlay,
              showClockOverlay: body.showClockOverlay,
              showRadioBadge: body.showRadioBadge,
              showTitleOverlay: body.showTitleOverlay,
              customCtaEnabled: body.customCtaEnabled,
              customCtaTitle: body.customCtaTitle,
              customCtaSubtitle: body.customCtaSubtitle,
              customCtaUrl: body.customCtaUrl,
              customCtaIntervalMinutes: Number(body.customCtaIntervalMinutes) || 5,
              customCtaDurationSeconds: Number(body.customCtaDurationSeconds) || 15,
            },
            create: {
              tenantId,
              showQrOverlay: body.showQrOverlay ?? true,
              showClockOverlay: body.showClockOverlay ?? true,
              showRadioBadge: body.showRadioBadge ?? true,
              showTitleOverlay: body.showTitleOverlay ?? true,
              customCtaEnabled: body.customCtaEnabled ?? false,
              customCtaTitle: body.customCtaTitle ?? "Siga nosso Instagram!",
              customCtaSubtitle: body.customCtaSubtitle ?? "Aponte a câmera do celular para conferir novidades e promoções.",
              customCtaUrl: body.customCtaUrl ?? "https://instagram.com",
              customCtaIntervalMinutes: Number(body.customCtaIntervalMinutes) || 5,
              customCtaDurationSeconds: Number(body.customCtaDurationSeconds) || 15,
            },
          }),
          300
        );
      }

      if (body.radioIndoorConfig) {
        const radio = body.radioIndoorConfig;
        await withDbTimeout(
          prisma.radioIndoorConfig.upsert({
            where: { tenantId },
            update: {
              provider: radio.provider,
              playlistUrl: radio.playlistUrl,
              playlistName: radio.playlistName,
              spotIntervalMinutes: radio.spotIntervalMinutes,
              syncWithSmartTv: radio.syncWithSmartTv,
              spotMessages: JSON.stringify(radio.spotMessages || []),
            },
            create: {
              tenantId,
              provider: radio.provider || "spotify",
              playlistUrl: radio.playlistUrl || "",
              playlistName: radio.playlistName || "Minha Rádio",
              spotIntervalMinutes: radio.spotIntervalMinutes || 15,
              syncWithSmartTv: radio.syncWithSmartTv ?? true,
              spotMessages: JSON.stringify(radio.spotMessages || []),
            },
          }),
          300
        );
      }
    } catch (dbErr) {}

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configurações." },
      { status: 500 }
    );
  }
}
