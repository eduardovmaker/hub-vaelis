import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

// Helper para mascarar chaves de API secretas e evitar vazamento em respostas HTTP
function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return "";
  return `****${key.slice(-4)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = (tenantId || "").trim();

  try {
    if (db) {
      const doc = await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(cleanTenantId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        return NextResponse.json({
          success: true,
          asaasConfig: {
            tenantId: cleanTenantId,
            walletId: data.walletId || "",
            apiKey: maskApiKey(data.apiKey),
            hasApiKey: !!data.apiKey,
            splitEnabled: data.splitEnabled ?? true,
            splitPercentage: data.splitPercentage ?? 90,
            platformFeePercentage: data.platformFeePercentage ?? 10,
            accountStatus: data.accountStatus || "ACTIVE",
            updatedAt: data.updatedAt,
          },
        });
      }
    }
  } catch (err: any) {}

  return NextResponse.json({
    success: true,
    asaasConfig: {
      tenantId: cleanTenantId,
      walletId: "",
      apiKey: "",
      hasApiKey: false,
      splitEnabled: true,
      splitPercentage: 90,
      platformFeePercentage: 10,
      accountStatus: "NOT_CONFIGURED",
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = (tenantId || "").trim();

  try {
    const body = await request.json();
    const { walletId, apiKey, splitEnabled, splitPercentage } = body;
    const cleanWalletId = (walletId || "").trim().replace(/[^\w-]/g, "");

    // Seguranca: A taxa da plataforma e definida exclusivamente pelo Admin.
    // Ignoramos qualquer tentativa de envio de porcentagem via body pelo tenant.
    let existingPlatformFee = 10;
    let finalApiKey = "";

    if (db) {
      const existingDoc = await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(cleanTenantId).get();
      if (existingDoc.exists) {
        const existingData = existingDoc.data() || {};
        if (typeof existingData.platformFeePercentage === "number") {
          existingPlatformFee = Math.min(100, Math.max(0, existingData.platformFeePercentage));
        }
        if (apiKey && apiKey.startsWith("****")) {
          finalApiKey = existingData?.apiKey || "";
        } else {
          finalApiKey = (apiKey || "").trim();
        }
      } else {
        finalApiKey = (apiKey || "").trim();
      }
    } else {
      finalApiKey = (apiKey || "").trim();
    }

    const platformFee = existingPlatformFee;
    const tenantSplitPercent = Math.max(0, 100 - platformFee);

    const updatedConfig = {
      tenantId: cleanTenantId,
      walletId: cleanWalletId,
      apiKey: finalApiKey,
      splitEnabled: splitEnabled !== undefined ? Boolean(splitEnabled) : true,
      splitPercentage: tenantSplitPercent,
      platformFeePercentage: platformFee,
      accountStatus: cleanWalletId ? "ACTIVE" : "PENDING_WALLET_ID",
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(cleanTenantId).set(updatedConfig, { merge: true });
    }

    return NextResponse.json({
      success: true,
      asaasConfig: {
        ...updatedConfig,
        apiKey: maskApiKey(finalApiKey),
        hasApiKey: !!finalApiKey,
      },
      message: "Configuração do Asaas & Split de Pagamento salva com sucesso e protegida!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configuração do Asaas." },
      { status: 500 }
    );
  }
}
