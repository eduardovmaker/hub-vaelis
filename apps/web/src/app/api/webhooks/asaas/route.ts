import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { provisionTenantMikrotikChr, stopTenantMikrotikChr } from "@/lib/docker-mikrotik";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, payment } = body;

    const tenantId = payment?.tenantId || body?.tenantId || "tenant_bar_01";
    const cycle = payment?.cycle || body?.cycle || "MENSAL";
    const addonId = payment?.addonId || body?.addonId || "midia-indoor";
    const eventType = event || body?.event || "PAYMENT_RECEIVED";

    let durationDays = 30;
    if (cycle === "TRIMESTRAL") durationDays = 90;
    if (cycle === "ANUAL") durationDays = 365;

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const asaasPaymentId = payment?.id || `pay_asaas_${Date.now()}`;

    if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
      // Gravação no Firebase Firestore
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

      let chrInfo = null;
      if (addonId === "captive-portal" || addonId === "wifi-hotspot" || addonId === "full-suite") {
        try {
          const chrContainer = await provisionTenantMikrotikChr(tenantId, tenantId);
          chrInfo = chrContainer;

          if (db) {
            await db.collection(COLLECTIONS.TENANTS).doc(tenantId).set(
              {
                needsChrProvision: true,
                chrStatus: "ACTIVE",
                chrContainerId: chrContainer.containerId,
              },
              { merge: true }
            );
          }
        } catch (chrErr) {
          console.error("Erro ao provisionar CHR no Webhook:", chrErr);
        }
      }

      return NextResponse.json({
        success: true,
        event: eventType,
        addonId,
        message: `Pagamento Asaas confirmado! Add-on [${addonId}] ativado para ${tenantId}.${chrInfo ? ' Container CHR provisionado.' : ' Módulo Cloud liberado (Sem CHR).'}`,
        chrInfo,
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

      if (addonId === "captive-portal" || addonId === "wifi-hotspot" || addonId === "full-suite") {
        await stopTenantMikrotikChr(tenantId).catch(() => {});
        if (db) {
          await db.collection(COLLECTIONS.TENANTS).doc(tenantId).set(
            { chrStatus: "STOPPED" },
            { merge: true }
          );
        }
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
