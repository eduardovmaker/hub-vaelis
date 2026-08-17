import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

export async function GET() {
  try {
    let totalSalesCount = 0;
    let totalSalesVolume = 0;
    let totalProductsCount = 0;
    let activeTvsCount = 0;
    let totalTenantsCount = 0;
    let asaasWalletsConfigured = 0;
    let recentSalesList: any[] = [];

    if (db) {
      // 1. Tenants count
      const tenantsSnapshot = await db.collection(COLLECTIONS.TENANTS).get();
      totalTenantsCount = tenantsSnapshot.size;

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

      // 3. Products count
      const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).get();
      totalProductsCount = productsSnapshot.size;

      // 4. TV Configs count
      const tvSnapshot = await db.collection(COLLECTIONS.TV_CONFIGS).get();
      activeTvsCount = tvSnapshot.docs.filter((doc) => doc.data()?.addonActive !== false).length;

      // 5. Asaas Configs count
      const asaasSnapshot = await db.collection(COLLECTIONS.ASAAS_CONFIGS).get();
      asaasWalletsConfigured = asaasSnapshot.docs.filter((doc) => doc.data()?.walletId).length;
    }

    // Ordenar vendas mais recentes primeiro
    recentSalesList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const platformCommission = totalSalesVolume * 0.10; // 10% de taxa da plataforma

    return NextResponse.json({
      success: true,
      analytics: {
        totalTenantsCount,
        totalSalesCount,
        totalSalesVolume,
        platformCommission,
        totalProductsCount,
        activeTvsCount,
        asaasWalletsConfigured,
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
