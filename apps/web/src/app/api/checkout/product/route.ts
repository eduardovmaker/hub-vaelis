import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";
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
    const { tenantId, productId, customerName, customerEmail, cpfCnpj, customerCpf, quantity, couponCode } = body;

    if (!tenantId || !productId) {
      return NextResponse.json(
        { success: false, error: "tenantId e productId são obrigatórios." },
        { status: 400 }
      );
    }

    // Sanitizar CPF ou CNPJ (remover pontos, traços e barras)
    const rawCpfCnpj = cpfCnpj || customerCpf || "";
    const cleanCpfCnpj = String(rawCpfCnpj).replace(/\D/g, "");

    if (!cleanCpfCnpj || (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14)) {
      return NextResponse.json(
        { success: false, error: "Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente." },
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
      const clientProvidedPrice = Number(body.productPrice || body.price || body.amount);
      const fallbackPrice = !isNaN(clientProvidedPrice) && clientProvidedPrice > 0 ? clientProvidedPrice : 45.00;
      product = {
        id: productId,
        name: body.productName || "Produto da Loja",
        price: fallbackPrice,
        stockQty: 50,
      };
    } else if (body.productPrice && Number(body.productPrice) > 0) {
      // Se o front-end enviou um preço atualizado do produto, utilizar o preço atualizado
      product.price = Number(body.productPrice);
    }

    const qty = Number(quantity) || 1;
    const grossValue = product.price * qty;

    // 🛡️ RECALCULAR DESCONTO DO CUPOM NO BACKEND (Anti-fraude)
    let discountAmount = 0;
    let finalValue = grossValue;
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      let couponDoc: any = null;

      // 1. Buscar no Firestore
      if (db) {
        const couponSnapshot = await db
          .collection(COLLECTIONS.COUPONS)
          .where("tenantId", "==", tenantId)
          .where("code", "==", cleanCode)
          .get();

        if (!couponSnapshot.empty) {
          const doc = couponSnapshot.docs[0];
          couponDoc = { id: doc.id, ...doc.data() };
        }
      }

      // 2. Fallback Prisma
      if (!couponDoc) {
        try {
          const pCoupon = await prisma.coupon.findFirst({
            where: { tenantId, code: cleanCode },
          });
          if (pCoupon) couponDoc = pCoupon;
        } catch (e) {}
      }

      // Validar regras do cupom no servidor
      if (couponDoc && couponDoc.isActive) {
        const notExpired = !couponDoc.expirationDate || new Date(couponDoc.expirationDate) >= new Date();
        const notMaxed =
          couponDoc.maxUses === null ||
          couponDoc.maxUses === undefined ||
          (couponDoc.usedCount || 0) < couponDoc.maxUses;

        if (notExpired && notMaxed) {
          if (couponDoc.discountType === "PERCENTAGE") {
            discountAmount = (grossValue * couponDoc.discountValue) / 100;
          } else {
            discountAmount = couponDoc.discountValue;
          }

          discountAmount = Math.min(grossValue, Math.max(0, discountAmount));
          finalValue = Math.max(0, grossValue - discountAmount);
          appliedCouponId = couponDoc.id;
          appliedCouponCode = couponDoc.code;

          // 📈 Incrementar usedCount no banco de dados (Firestore + Prisma)
          try {
            if (db) {
              const couponRef = db.collection(COLLECTIONS.COUPONS).doc(couponDoc.id);
              const currentCount = couponDoc.usedCount || 0;
              await couponRef.update({
                usedCount: currentCount + 1,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (incErr) {
            console.warn("Aviso ao incrementar usedCount no Firestore:", incErr);
          }

          try {
            await prisma.coupon.update({
              where: { id: couponDoc.id },
              data: { usedCount: { increment: 1 } },
            });
          } catch (incPrismaErr) {
            console.warn("Aviso ao incrementar usedCount no Prisma:", incPrismaErr);
          }
        }
      }
    }

    const finalAmountToCharge = Number(finalValue.toFixed(2));

    // Buscar configuração de Split Asaas do Tenant (taxa da plataforma gerenciada via Admin)
    let splitRules = undefined;
    if (db) {
      const asaasDoc = await db.collection(COLLECTIONS.ASAAS_CONFIGS).doc(tenantId).get();
      if (asaasDoc.exists) {
        const asaasData = asaasDoc.data();
        const rawWalletId = (asaasData?.walletId || "").trim();
        const platformFee = typeof asaasData?.platformFeePercentage === "number" ? asaasData.platformFeePercentage : 10;
        const tenantSplitPercent = Math.max(0, 100 - platformFee);

        if (asaasData?.splitEnabled && rawWalletId) {
          splitRules = [
            {
              walletId: rawWalletId,
              percentualValue: Math.min(100, Math.max(0, tenantSplitPercent)),
            },
          ];
        }
      }
    }

    // Criar/Obter cliente no Asaas
    const customer = await createOrGetAsaasCustomer({
      name: customerName || "Cliente Balcão",
      email: customerEmail || `cliente_${Date.now()}@vaelis.com.br`,
      cpfCnpj: cleanCpfCnpj,
    });

    // Criar Pagamento Pix com Split no Asaas (usando valor líquido recalculado)
    const payment = await createAsaasPixPayment({
      customerId: customer.id,
      value: finalAmountToCharge,
      description: appliedCouponCode
        ? `Compra: ${product.name} (Qtd: ${qty}) - Cupom: ${appliedCouponCode} (-R$ ${discountAmount.toFixed(2)})`
        : `Compra: ${product.name} (Qtd: ${qty}) - ${tenantId}`,
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
        grossAmount: grossValue,
        discountAmount: Number(discountAmount.toFixed(2)),
        totalAmount: finalAmountToCharge,
        couponCode: appliedCouponCode || null,
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
