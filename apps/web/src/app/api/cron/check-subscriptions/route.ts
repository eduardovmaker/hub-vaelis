import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // 🔒 Validar Authorization Header (CRON_SECRET) nativo da Vercel
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (
      process.env.NODE_ENV === "production" &&
      cronSecret &&
      authHeader !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado. Header CRON_SECRET inválido." },
        { status: 401 }
      );
    }

    const apiKey = process.env.ASAAS_API_KEY;
    const apiUrl = (process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3").replace(/\/$/, "");

    let suspendedCount = 0;
    const processedTenants: string[] = [];

    if (apiKey) {
      // 1. Consultar cobrancas inadimplentes (OVERDUE) no Asaas
      const response = await fetch(`${apiUrl}/payments?status=OVERDUE&limit=100`, {
        method: "GET",
        headers: {
          access_token: apiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const overduePayments = data.data || [];

        for (const payment of overduePayments) {
          const tenantId = payment.externalReference;
          if (tenantId && db && !processedTenants.includes(tenantId)) {
            // Suspender tenant no banco de dados (Firestore)
            await db.collection(COLLECTIONS.TENANTS).doc(tenantId).update({
              status: "SUSPENDED",
              paymentStatus: "OVERDUE",
              updatedAt: new Date().toISOString(),
            });
            processedTenants.push(tenantId);
            suspendedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Verificação de assinaturas concluída com sucesso.",
      suspendedTenants: suspendedCount,
      tenantsAffected: processedTenants,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro no Cron Job de verificação Asaas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao executar verificação de assinaturas." },
      { status: 500 }
    );
  }
}
