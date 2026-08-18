import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

export async function GET() {
  try {
    let totalSalesCount = 0;
    let totalSalesVolume = 0;
    let totalProductsCount = 0;
    let activeTvsCount = 0;
    let totalTenantsCount = 0;
    let activeTenantsCount = 0;
    let totalLeadsCount = 0;
    let totalMrr = 0;
    let asaasWalletsConfigured = 0;
    let recentSalesList: any[] = [];

    if (db) {
      // 1. Tenants analytics & MRR calculation
      const tenantsSnapshot = await db.collection(COLLECTIONS.TENANTS).get();
      totalTenantsCount = tenantsSnapshot.size;

      tenantsSnapshot.docs.forEach((doc) => {
        const tData = doc.data();
        const isBlocked = tData.paymentStatus === "OVERDUE";
        const isVip = tData.subscriptionExpiresAt?.startsWith("2099");

        if (!isBlocked) {
          activeTenantsCount++;
          if (!isVip) {
            // MRR base de assinatura R$ 99 por cliente Asaas ativo
            totalMrr += 99.00;
          }
        }
      });

      // 2. Sales analytics
      const salesSnapshot = await db.collection(COLLECTIONS.SALES).get();
      if (!salesSnapshot.empty) {
        totalSalesCount = salesSnapshot.size;
        salesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          totalSalesVolume += Number(data.totalAmount || data.totalPrice || 0);
          recentSalesList.push({ id: doc.id, ...data });
        });
      }

      // 3. Leads aggregation
      const botSnapshot = await db.collection(COLLECTIONS.WHATSAPP_BOT_CONFIGS).get();
      if (!botSnapshot.empty) {
        botSnapshot.docs.forEach((doc) => {
          totalLeadsCount += Number(doc.data()?.capturedLeadsCount || 0);
        });
      }

      // 4. Products count
      const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).get();
      totalProductsCount = productsSnapshot.size;

      // 5. TV Configs count
      const tvSnapshot = await db.collection(COLLECTIONS.TV_CONFIGS).get();
      activeTvsCount = tvSnapshot.docs.filter((doc) => doc.data()?.addonActive !== false).length;

      // 6. Asaas Configs count
      const asaasSnapshot = await db.collection(COLLECTIONS.ASAAS_CONFIGS).get();
      asaasWalletsConfigured = asaasSnapshot.docs.filter((doc) => doc.data()?.walletId).length;
    }

    // Ordenar vendas mais recentes primeiro
    recentSalesList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const platformCommission = totalSalesVolume * 0.10; // 10% de taxa da plataforma
    const hasMasterAsaasKey = !!process.env.ASAAS_API_KEY;
    const asaasEnvironment = process.env.ASAAS_API_URL?.includes("sandbox") ? "SANDBOX" : process.env.ASAAS_API_KEY ? "PRODUCTION" : "SIMULATED";

    return NextResponse.json({
      success: true,
      analytics: {
        totalTenantsCount,
        activeTenantsCount,
        totalMrr,
        totalLeadsCount,
        totalSalesCount,
        totalSalesVolume,
        platformCommission,
        totalProductsCount,
        activeTvsCount,
        asaasWalletsConfigured,
        hasMasterAsaasKey,
        asaasEnvironment,
        recentSales: recentSalesList.slice(0, 10),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao buscar analíticos globais." },
      { status: 500 }
    );
  }
}
