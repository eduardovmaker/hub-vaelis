import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { createOrGetAsaasCustomer, createAsaasPixPayment, getAsaasPixQrCode } from "@/lib/asaas";

const ADDONS_PRICING: Record<string, { title: string; priceMensal: number; priceTrimestral: number; priceAnual: number }> = {
  "midia-indoor": {
    title: "Add-on Mídia Indoor (TV Player Digital Signage)",
    priceMensal: 89,
    priceTrimestral: 239,
    priceAnual: 790,
  },
  "radio-indoor": {
    title: "Add-on Rádio Indoor Comercial (Spotify & YouTube)",
    priceMensal: 79,
    priceTrimestral: 209,
    priceAnual: 690,
  },
  "google-reviews": {
    title: "Add-on Reputação Automática no Google Maps",
    priceMensal: 49,
    priceTrimestral: 129,
    priceAnual: 440,
  },
  "whatsapp-bot": {
    title: "Add-on WhatsApp Bot & Captura de Leads",
    priceMensal: 69,
    priceTrimestral: 189,
    priceAnual: 620,
  },
  "roleta-da-sorte": {
    title: "Add-on Roleta da Sorte Digital (Gamificação)",
    priceMensal: 59,
    priceTrimestral: 159,
    priceAnual: 520,
  },
  "mikrotik-firewall": {
    title: "Add-on Filtro de Conteúdo & Guardião MikroTik",
    priceMensal: 99,
    priceTrimestral: 269,
    priceAnual: 890,
  },
  "multi-unidades": {
    title: "Add-on Multi-Unidades / Franquias & Analytics",
    priceMensal: 149,
    priceTrimestral: 399,
    priceAnual: 1290,
  },
  "loja-virtual": {
    title: "Add-on Loja de Produtos & Estoque (Vendas via Pix)",
    priceMensal: 89,
    priceTrimestral: 239,
    priceAnual: 790,
  },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { addonId, cycle = "MENSAL", customerName, customerEmail, cpfCnpj } = body;

    if (!addonId || !ADDONS_PRICING[addonId]) {
      return NextResponse.json(
        { success: false, error: "Módulo Add-on inválido ou não informado." },
        { status: 400 }
      );
    }

    const addonInfo = ADDONS_PRICING[addonId];
    let price = addonInfo.priceMensal;
    if (cycle === "TRIMESTRAL") price = addonInfo.priceTrimestral;
    if (cycle === "ANUAL") price = addonInfo.priceAnual;

    // Buscar dados adicionais do Tenant se disponível
    let tenantName = customerName || tenantId;
    let tenantEmail = customerEmail || `${tenantId}@tenant.vaelis.com.br`;

    if (db) {
      try {
        const tenantDoc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
        if (tenantDoc.exists) {
          const tData = tenantDoc.data();
          if (tData?.name) tenantName = tData.name;
          if (tData?.email) tenantEmail = tData.email;
        }
      } catch (dbErr) {
        console.warn("[Addon Checkout] Aviso ao carregar dados do tenant:", dbErr);
      }
    }

    // 1. Criar/Obter Cliente no Asaas (Conta Master)
    const customer = await createOrGetAsaasCustomer({
      name: tenantName,
      email: tenantEmail,
      cpfCnpj: cpfCnpj || undefined,
    });

    // 2. Criar Cobrança Pix para a Conta Master (sem split rules, pois é mensalidade do módulo da plataforma)
    const payment = await createAsaasPixPayment({
      customerId: customer.id,
      value: price,
      description: `Mensalidade ${addonInfo.title} (${cycle}) - Tenant: ${tenantId}`,
      externalReference: tenantId,
    });

    // 3. Obter QR Code Pix e Copia e Cola
    let qrCodeData = payment.pixQrCode || (payment.id ? (await getAsaasPixQrCode(payment.id)) || undefined : undefined);

    const pixPayload = qrCodeData?.payload || "";
    const pixEncodedImage = qrCodeData?.encodedImage || "";

    // 4. Salvar estado de pendência de pagamento no Firestore se db ativo
    if (db) {
      try {
        const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
        await tenantRef.set(
          {
            addonStates: {
              [addonId]: {
                active: false,
                paymentStatus: "PENDING",
                planCycle: cycle,
                asaasPaymentId: payment.id,
                updatedAt: new Date().toISOString(),
              },
            },
          },
          { merge: true }
        );
      } catch (saveErr) {
        console.error("[Addon Checkout] Erro ao salvar estado pendente no Firestore:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      addonId,
      cycle,
      price,
      pixCopiaECola: pixPayload,
      encodedImage: pixEncodedImage,
      expirationDate: qrCodeData?.expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error("[Addon Checkout] Erro ao gerar cobrança de Add-on:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar cobrança do Add-on via Asaas." },
      { status: 500 }
    );
  }
}
