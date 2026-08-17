import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

function sanitizeText(str?: string): string {
  if (!str) return "";
  return str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  try {
    if (db) {
      const snapshot = await db
        .collection(COLLECTIONS.SALES)
        .where("tenantId", "==", cleanTenantId)
        .get();

      if (!snapshot.empty) {
        const sales = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        return NextResponse.json({ success: true, sales });
      }
    }
  } catch (err: any) {
    console.error("Erro ao buscar histórico de vendas Pix:", err);
  }

  return NextResponse.json({ success: true, sales: [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  try {
    const body = await request.json();
    const { productId, productName, quantity, totalAmount, customerName, asaasPaymentId } = body;

    const cleanProductName = sanitizeText(productName);
    const numTotal = Number(totalAmount);
    const qtyNum = Math.max(1, Math.floor(Number(quantity) || 1));

    if (!cleanProductName || isNaN(numTotal) || numTotal <= 0) {
      return NextResponse.json(
        { success: false, error: "Nome do produto e valor total positivo são obrigatórios." },
        { status: 400 }
      );
    }

    const saleId = `sale_${Date.now()}`;
    const cleanProductId = sanitizeText(productId);

    const newSale = {
      id: saleId,
      tenantId: cleanTenantId,
      productId: cleanProductId || null,
      productName: cleanProductName,
      quantity: qtyNum,
      totalAmount: numTotal,
      customerName: sanitizeText(customerName) || "Cliente Pix",
      paymentStatus: "PAID",
      asaasPaymentId: sanitizeText(asaasPaymentId) || `pay_pix_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      const batch = db.batch();
      const saleRef = db.collection(COLLECTIONS.SALES).doc(saleId);
      batch.set(saleRef, newSale);

      // Baixa automática no estoque com verificação IDOR
      if (cleanProductId) {
        const prodRef = db.collection(COLLECTIONS.PRODUCTS).doc(cleanProductId);
        const prodDoc = await prodRef.get();
        if (prodDoc.exists) {
          const prodData = prodDoc.data();
          if (!prodData?.tenantId || prodData.tenantId === cleanTenantId) {
            const currentStock = prodData?.stockQty || 0;
            const updatedStock = Math.max(0, currentStock - qtyNum);
            batch.update(prodRef, {
              stockQty: updatedStock,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      sale: newSale,
      message: "Venda Pix registrada com sucesso e baixa efetuada no estoque!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao registrar venda." },
      { status: 500 }
    );
  }
}
