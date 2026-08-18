import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

export async function POST(request: Request) {
  try {
    // 1. Validação de Segurança do Webhook (Access Token Header)
    const accessToken = request.headers.get("asaas-access-token") || request.headers.get("access-token");
    const configuredSecret = process.env.ASAAS_WEBHOOK_ACCESS_TOKEN || process.env.ASAAS_API_KEY;

    if (configuredSecret) {
      if (!accessToken || accessToken.trim() !== configuredSecret.trim()) {
        console.warn("⚠️ Tentativa de requisição não autorizada ao Webhook Asaas. Token ausente ou incorreto.");
        return NextResponse.json(
          { success: false, error: "Não Autorizado. Token de segurança do Webhook Asaas inválido." },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { event, payment } = body;

    // 2. Extração segura do ID do Tenant (Sem fallbacks hardcoded de mock)
    const tenantId = payment?.externalReference || payment?.tenantId || body?.externalReference || body?.tenantId;

    if (!tenantId) {
      console.warn("[Webhook Asaas] Requisição recebida sem vínculo de tenantId (externalReference).");
      return NextResponse.json(
        { success: false, error: "Informação do tenantId/externalReference ausente na notificação do pagamento." },
        { status: 400 }
      );
    }

    const cycle = payment?.cycle || body?.cycle || "MENSAL";
    const addonId = payment?.addonId || body?.addonId || "midia-indoor";
    const eventType = event || body?.event || "PAYMENT_RECEIVED";

    let durationDays = 30;
    if (cycle === "TRIMESTRAL") durationDays = 90;
    if (cycle === "ANUAL") durationDays = 365;

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const asaasPaymentId = payment?.id || `pay_asaas_${Date.now()}`;

    if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
      // 1. Processar baixa de estoque para Vendas de Produtos (Fase 3 - Regra de Negócio)
      if (db && asaasPaymentId) {
        try {
          const salesQuery = await db
            .collection(COLLECTIONS.SALES)
            .where("asaasPaymentId", "==", asaasPaymentId)
            .get();

          if (!salesQuery.empty) {
            for (const doc of salesQuery.docs) {
              const saleData = doc.data();
              if (saleData.paymentStatus !== "PAID") {
                // Marcar venda como paga
                await doc.ref.update({
                  paymentStatus: "PAID",
                  paidAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });

                // Decrementar quantidade comprada do estoque do produto
                if (saleData.productId) {
                  const prodRef = db.collection(COLLECTIONS.PRODUCTS).doc(saleData.productId);
                  const prodDoc = await prodRef.get();

                  if (prodDoc.exists) {
                    const prodData = prodDoc.data() || {};
                    const currentStock = typeof prodData.stockQty === "number" ? prodData.stockQty : 0;
                    const qtyPurchased = Number(saleData.quantity) || 1;
                    const newStock = Math.max(0, currentStock - qtyPurchased);
                    const minStock = typeof prodData.minStock === "number" 
                      ? prodData.minStock 
                      : (typeof prodData.estoqueMinimo === "number" ? prodData.estoqueMinimo : 5);

                    // Baixa no estoque
                    await prodRef.update({
                      stockQty: newStock,
                      updatedAt: new Date().toISOString(),
                    });

                    console.log(`[Webhook Asaas] Baixa de estoque efetuada para ${prodData.name || saleData.productId}: ${currentStock} -> ${newStock} un.`);

                    // Lógica de Alerta de Estoque Mínimo (estoqueAtual <= estoqueMinimo)
                    if (newStock <= minStock) {
                      const alertId = `alert_stock_${saleData.productId}_${Date.now()}`;
                      await db.collection(COLLECTIONS.NOTIFICATIONS).doc(alertId).set({
                        id: alertId,
                        tenantId: saleData.tenantId || tenantId,
                        type: "LOW_STOCK_ALERT",
                        title: "⚠️ Alerta de Estoque Mínimo",
                        message: `O produto "${prodData.name || saleData.productName}" atingiu o estoque mínimo de ${minStock} unidades (Estoque Atual: ${newStock}). Reposição necessária!`,
                        productId: saleData.productId,
                        productName: prodData.name || saleData.productName,
                        currentStock: newStock,
                        minStock: minStock,
                        read: false,
                        createdAt: new Date().toISOString(),
                      });
                      console.warn(`[Webhook Asaas] ⚠️ Alerta de Estoque Mínimo gravado no banco para Tenant ${saleData.tenantId || tenantId} (Produto ${prodData.name}).`);
                    }
                  }
                }
              }
            }
          }
        } catch (salesErr) {
          console.error("[Webhook Asaas] Erro ao processar baixa de estoque na venda:", salesErr);
        }
      }

      // 2. Gravação no Firebase Firestore para Assinaturas/Addons do Tenant
      if (db) {
        const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
        await tenantRef.set(
          {
            addonStates: {
              [addonId]: {
                active: true,
                paymentStatus: "PAID",
                planCycle: cycle,
                subscriptionExpiresAt: expiresAt.toISOString(),
                asaasPaymentId,
                updatedAt: new Date().toISOString(),
              },
            },
          },
          { merge: true }
        );
      }

      return NextResponse.json({
        success: true,
        event: eventType,
        addonId,
        message: `Pagamento Asaas confirmado! Add-on [${addonId}] ativado para ${tenantId}.`,
        config: {
          tenantId,
          addonId,
          addonActive: true,
          paymentStatus: "PAID",
          planCycle: cycle,
          subscriptionExpiresAt: expiresAt.toISOString(),
          asaasPaymentId,
          autoRenew: true,
        },
      });
    }

    if (eventType === "PAYMENT_OVERDUE" || eventType === "PAYMENT_DELETED") {
      if (db) {
        const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
        await tenantRef.set(
          {
            addonStates: {
              [addonId]: {
                active: false,
                paymentStatus: "OVERDUE",
                subscriptionExpiresAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
          },
          { merge: true }
        );
      }

      return NextResponse.json({
        success: true,
        event: eventType,
        addonId,
        message: `Pagamento Asaas em atraso! Add-on [${addonId}] bloqueado para ${tenantId}.`,
        config: {
          tenantId,
          addonId,
          addonActive: false,
          paymentStatus: "OVERDUE",
          subscriptionExpiresAt: new Date().toISOString(),
          autoRenew: false,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Webhook Asaas recebido sem alterações." });
  } catch (error: any) {
    console.error("Erro no Webhook Asaas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar Webhook Asaas no banco de dados." },
      { status: 400 }
    );
  }
}

