import { NextResponse } from "next/server";
import { db, prisma, COLLECTIONS } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = (tenantId || "").trim();

  try {
    let config = {
      tenantId: cleanTenantId,
      walletId: "",
      splitEnabled: true,
      splitPercentage: 90,
      platformFeePercentage: 10,
      accountStatus: "NOT_CONFIGURED",
    };

    if (db) {
      const doc = await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(cleanTenantId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        config = {
          tenantId: cleanTenantId,
          walletId: data.walletId || "",
          splitEnabled: data.splitEnabled ?? true,
          splitPercentage: data.splitPercentage ?? 90,
          platformFeePercentage: data.platformFeePercentage ?? 10,
          accountStatus: data.accountStatus || "ACTIVE",
        };
      }
    }

    return NextResponse.json({ success: true, asaasConfig: config });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao buscar taxa da plataforma do tenant." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = (tenantId || "").trim();

  try {
    const body = await request.json();
    const { platformFeePercentage } = body;

    if (typeof platformFeePercentage !== "number" || isNaN(platformFeePercentage)) {
      return NextResponse.json(
        { success: false, error: "O parâmetro 'platformFeePercentage' deve ser um número válido." },
        { status: 400 }
      );
    }

    const cleanFee = Math.min(100, Math.max(0, Number(platformFeePercentage.toFixed(2))));
    const cleanTenantSplit = Math.max(0, Number((100 - cleanFee).toFixed(2)));

    const updateData = {
      tenantId: cleanTenantId,
      platformFeePercentage: cleanFee,
      splitPercentage: cleanTenantSplit,
      updatedAt: new Date().toISOString(),
    };

    // 1. Atualizar no Firestore
    if (db) {
      await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(cleanTenantId).set(updateData, { merge: true });
    }

    // 2. Atualizar no Prisma PostgreSQL (se conectado)
    try {
      if (prisma) {
        await prisma.asaasConfig.upsert({
          where: { tenantId: cleanTenantId },
          update: {
            platformFeePercentage: cleanFee,
            splitPercentage: cleanTenantSplit,
          },
          create: {
            tenantId: cleanTenantId,
            platformFeePercentage: cleanFee,
            splitPercentage: cleanTenantSplit,
            walletId: "",
            apiKey: "",
          },
        });
      }
    } catch (prismaErr) {
      // Ignora erro se Prisma/Postgres não estiver conectado em ambiente dev offline
    }

    return NextResponse.json({
      success: true,
      platformFeePercentage: cleanFee,
      splitPercentage: cleanTenantSplit,
      message: `Taxa da plataforma para o tenant [${cleanTenantId}] atualizada com sucesso para ${cleanFee}%!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar taxa da plataforma." },
      { status: 500 }
    );
  }
}
