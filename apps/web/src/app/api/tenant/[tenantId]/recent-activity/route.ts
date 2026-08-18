import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";

function sanitizeText(str?: string): string {
  if (!str) return "";
  return str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface ActivityEvent {
  id: string;
  type: "SALES" | "COUPONS" | "LEADS";
  title: string;
  client: string;
  details: string;
  value: string;
  date: string;
  timestamp: number;
  status: string;
  iconType: "sales" | "coupons" | "leads";
  color: "emerald" | "amber" | "blue";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  if (!cleanTenantId) {
    return NextResponse.json(
      { success: false, error: "ID do estabelecimento não fornecido." },
      { status: 400 }
    );
  }

  const activities: ActivityEvent[] = [];

  try {
    // 1. Vendas Pix (Sales)
    let salesData: any[] = [];
    if (db) {
      try {
        const salesSnapshot = await db
          .collection(COLLECTIONS.SALES)
          .where("tenantId", "==", cleanTenantId)
          .get();

        if (!salesSnapshot.empty) {
          salesData = salesSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
      } catch (err) {
        console.warn("Aviso ao buscar vendas no Firestore:", err);
      }
    }

    if (salesData.length === 0) {
      try {
        salesData = await prisma.productSale.findMany({
          where: { tenantId: cleanTenantId },
          orderBy: { createdAt: "desc" },
          take: 15,
        });
      } catch (err) {
        console.warn("Aviso ao buscar vendas no Prisma:", err);
      }
    }

    salesData.forEach((s: any) => {
      const createdAtDate = s.createdAt ? new Date(s.createdAt) : new Date();
      const numAmount = Number(s.totalAmount || s.price || 0);
      activities.push({
        id: s.id || `sale_${Math.random()}`,
        type: "SALES",
        title: "Venda Pix Aprovada",
        client: s.customerName || "Cliente Balcão",
        details: s.productName ? `${s.productName}${s.quantity && s.quantity > 1 ? ` (${s.quantity}x)` : ""}` : "Produto Pix",
        value: `R$ ${numAmount.toFixed(2)}`,
        date: createdAtDate.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        timestamp: createdAtDate.getTime(),
        status: "PIX APROVADO",
        iconType: "sales",
        color: "emerald",
      });
    });

    // 2. Histórico de Cupons (Coupons)
    let couponsData: any[] = [];
    if (db) {
      try {
        const couponsSnapshot = await db
          .collection(COLLECTIONS.COUPONS)
          .where("tenantId", "==", cleanTenantId)
          .get();

        if (!couponsSnapshot.empty) {
          couponsData = couponsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
      } catch (err) {
        console.warn("Aviso ao buscar cupons no Firestore:", err);
      }
    }

    if (couponsData.length === 0) {
      try {
        couponsData = await prisma.coupon.findMany({
          where: { tenantId: cleanTenantId },
          orderBy: { updatedAt: "desc" },
          take: 15,
        });
      } catch (err) {
        console.warn("Aviso ao buscar cupons no Prisma:", err);
      }
    }

    couponsData.forEach((c: any) => {
      const updatedDate = c.updatedAt ? new Date(c.updatedAt) : c.createdAt ? new Date(c.createdAt) : new Date();
      const isUsed = Boolean(c.usedCount && c.usedCount > 0);
      const discountText = c.discountType === "PERCENTAGE"
        ? `${c.discountValue}% de Desconto`
        : `Desconto de R$ ${Number(c.discountValue || 0).toFixed(2)}`;

      activities.push({
        id: c.id || `coupon_${Math.random()}`,
        type: "COUPONS",
        title: isUsed ? "Cupom Resgatado" : "Cupom Gerado",
        client: c.usedBy || "Cliente Hub",
        details: discountText,
        value: c.code || "CUPOM-VIP",
        date: updatedDate.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        timestamp: updatedDate.getTime(),
        status: isUsed ? "RESGATADO" : "GERADO",
        iconType: "coupons",
        color: "amber",
      });
    });

    // 3. Leads Capturados (Leads)
    let leadsData: any[] = [];
    if (db) {
      try {
        const leadsSnapshot = await db
          .collection("leads")
          .where("tenantId", "==", cleanTenantId)
          .get();

        if (!leadsSnapshot.empty) {
          leadsData = leadsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
      } catch (err) {
        console.warn("Aviso ao buscar leads no Firestore:", err);
      }
    }

    leadsData.forEach((l: any) => {
      const createdDate = l.createdAt ? new Date(l.createdAt) : new Date();
      activities.push({
        id: l.id || `lead_${Math.random()}`,
        type: "LEADS",
        title: "Lead Capturado",
        client: l.name || "Cliente WhatsApp",
        details: l.whatsapp || l.phone || "WhatsApp validado",
        value: l.origin || "Roleta / QR Code",
        date: createdDate.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        timestamp: createdDate.getTime(),
        status: "LEAD CAPTURADO",
        iconType: "leads",
        color: "blue",
      });
    });

    // Merge, Ordenação por Data DESC e Limite dos últimos 15 eventos
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const sortedActivities = activities.slice(0, 15);

    return NextResponse.json({
      success: true,
      activities: sortedActivities,
    });
  } catch (err: any) {
    console.error("Erro ao buscar atividade recente do Hub:", err);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar atividades recentes.", activities: [] },
      { status: 500 }
    );
  }
}
