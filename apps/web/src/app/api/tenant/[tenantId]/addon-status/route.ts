import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const addonId = searchParams.get("addonId");
    const paymentId = searchParams.get("paymentId");

    if (!addonId) {
      return NextResponse.json(
        { success: false, error: "Parâmetro addonId é obrigatório." },
        { status: 400 }
      );
    }

    if (db) {
      const tenantDoc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
      if (tenantDoc.exists) {
        const data = tenantDoc.data();
        const addonState = data?.addonStates?.[addonId];
        
        if (addonState) {
          const isPaid = addonState.paymentStatus === "PAID" || addonState.active === true;
          return NextResponse.json({
            success: true,
            active: isPaid,
            paymentStatus: addonState.paymentStatus || (isPaid ? "PAID" : "PENDING"),
            planCycle: addonState.planCycle || "MENSAL",
            subscriptionExpiresAt: addonState.subscriptionExpiresAt,
            asaasPaymentId: addonState.asaasPaymentId || paymentId,
          });
        }
      }

      // Checagem no TV_CONFIGS fallback
      const tvDoc = await db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).get();
      if (tvDoc.exists) {
        const tvData = tvDoc.data();
        const addonState = tvData?.addonStates?.[addonId];
        if (addonState) {
          const isPaid = addonState.paymentStatus === "PAID" || addonState.active === true;
          return NextResponse.json({
            success: true,
            active: isPaid,
            paymentStatus: addonState.paymentStatus || (isPaid ? "PAID" : "PENDING"),
            planCycle: addonState.planCycle || "MENSAL",
            subscriptionExpiresAt: addonState.subscriptionExpiresAt,
            asaasPaymentId: addonState.asaasPaymentId || paymentId,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      active: false,
      paymentStatus: "PENDING",
    });
  } catch (error: any) {
    console.error("[Addon Status] Erro ao consultar status do Add-on:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao consultar status do Add-on." },
      { status: 500 }
    );
  }
}
