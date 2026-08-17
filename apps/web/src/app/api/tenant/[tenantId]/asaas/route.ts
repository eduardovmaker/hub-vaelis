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

    // Sanitização e limites de valores
    const cleanWalletId = (walletId || "").trim().replace(/[^\w-]/g, "");
    const tenantSplitPercent = typeof splitPercentage === "number" 
      ? Math.min(100, Math.max(0, splitPercentage)) 
      : 90;
    const platformFee = 100 - tenantSplitPercent;

    let finalApiKey = "";
    if (db) {
      const existingDoc = await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(cleanTenantId).get();
      const existingData = existingDoc.exists ? existingDoc.data() : {};

      // Se a chave enviada for mascarada (****), mantém a chave original armazenada no banco de dados
      if (apiKey && apiKey.startsWith("****")) {
        finalApiKey = existingData?.apiKey || "";
      } else {
        finalApiKey = (apiKey || "").trim();
      }
    } else {
      finalApiKey = (apiKey || "").trim();
    }

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
