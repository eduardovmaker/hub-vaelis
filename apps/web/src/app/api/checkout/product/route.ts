import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { createOrGetAsaasCustomer, createAsaasPixPayment } from "@/lib/asaas";
import { checkoutRatelimit, checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    // 🛡️ Rate limit por IP (10 req/min)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rl = await checkRateLimit(checkoutRatelimit, `checkout_${ip}`);

    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Limite de requisições de checkout excedido. Por favor, aguarde 1 minuto.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { tenantId, productId, customerName, customerEmail, customerCpf, quantity } = body;

    if (!tenantId || !productId) {
      return NextResponse.json(
        { success: false, error: "tenantId e productId são obrigatórios." },
        { status: 400 }
      );
    }

    // Buscar o produto no Firestore
    let product: any = null;
    if (db) {
      const prodDoc = await db.collection(COLLECTIONS.PRODUCTS).doc(productId).get();
      if (prodDoc.exists) {
        product = { id: prodDoc.id, ...prodDoc.data() };
      }
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    const qty = Number(quantity) || 1;
    const totalValue = product.price * qty;

    // Buscar configuração de Split Asaas do Tenant
    let splitRules = undefined;
    if (db) {
      const asaasDoc = await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(tenantId).get();
      if (asaasDoc.exists) {
        const asaasData = asaasDoc.data();
        const rawWalletId = (asaasData?.walletId || "").trim();
        const splitPct = typeof asaasData?.splitPercentage === "number" ? asaasData.splitPercentage : 90;

        if (asaasData?.splitEnabled && rawWalletId) {
          splitRules = [
            {
              walletId: rawWalletId,
              percentualValue: Math.min(100, Math.max(0, splitPct)),
            },
          ];
        }
      }
    }

    // Criar/Obter cliente no Asaas
    const customer = await createOrGetAsaasCustomer({
      name: customerName || "Cliente Balcão",
      email: customerEmail || `cliente_${Date.now()}@vaelis.com.br`,
      cpfCnpj: customerCpf || undefined,
    });

    // Criar Pagamento Pix com Split no Asaas
    const payment = await createAsaasPixPayment({
      customerId: customer.id,
      value: totalValue,
      description: `Compra: ${product.name} (Qtd: ${qty}) - ${tenantId}`,
      externalReference: tenantId,
      split: splitRules,
    });

    // Gravar pendência de venda no Firestore
    const saleId = `sale_${Date.now()}`;
    if (db) {
      await db.collection(COLLECTIONS.SALES).doc(saleId).set({
        id: saleId,
        tenantId,
        productId,
        productName: product.name,
        quantity: qty,
        totalAmount: totalValue,
        customerName: customerName || "Cliente Balcão",
        paymentStatus: "PENDING",
        asaasPaymentId: payment.id,
        splitApplied: !!splitRules,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      saleId,
      asaas: {
        paymentId: payment.id,
        status: payment.status,
        pixQrCodeImage: payment.pixQrCode?.encodedImage || "",
        pixCopyPaste: payment.pixQrCode?.payload || "",
        expiresAt: payment.pixQrCode?.expirationDate || "",
      },
    });
  } catch (err: any) {
    console.error("Erro no checkout do produto:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao gerar Pix do produto." },
      { status: 500 }
    );
  }
}
