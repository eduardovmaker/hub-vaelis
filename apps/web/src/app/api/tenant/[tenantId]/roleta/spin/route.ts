import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";
import { Coupon, DiscountType } from "@/types/coupon";

function sanitizeText(str?: string): string {
  if (!str) return "";
  return str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parsePrizeDiscount(prizeName: string): { type: DiscountType; value: number } | null {
  if (!prizeName) return null;

  // Check for percentage discount e.g. "15% OFF na Pomada Matte", "20% OFF na Barba Terapia", "10% OFF"
  const percentMatch = prizeName.match(/(\d+(?:[.,]\d+)?)\s*%/i);
  if (percentMatch) {
    const val = parseFloat(percentMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0 && val <= 100) {
      return { type: "PERCENTAGE", value: val };
    }
  }

  // Check for fixed amount discount e.g. "R$ 10 de Desconto", "R$ 15 OFF", "Desconto de R$ 10"
  const fixedMatch = prizeName.match(/R\$\s*(\d+(?:[.,]\d{2})?)/i);
  if (fixedMatch) {
    const val = parseFloat(fixedMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0) {
      return { type: "FIXED", value: val };
    }
  }

  return null;
}

function generateRandomCode(prefix: string = "ROLETA-", length: number = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sem caracteres ambíguos
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const cleanTenantId = sanitizeText(tenantId);
    const body = await request.json();
    const { prizeName, prizeId, customerName, customerWhatsapp } = body;

    const cleanPrizeName = sanitizeText(prizeName);

    if (!cleanTenantId || !cleanPrizeName) {
      return NextResponse.json(
        { success: false, error: "Informe o tenantId e o nome do prêmio." },
        { status: 400 }
      );
    }

    const discountInfo = parsePrizeDiscount(cleanPrizeName);
    let generatedCoupon: Coupon | null = null;

    if (discountInfo) {
      // Gerar código único no formato ROLETA-XXXXX
      const rawCode = generateRandomCode("ROLETA-", 5);
      const couponId = `coupon_roleta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Validade estrita de 2 horas (Urgência)
      const expirationDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const couponData: Coupon = {
        id: couponId,
        tenantId: cleanTenantId,
        code: rawCode,
        discountType: discountInfo.type,
        discountValue: discountInfo.value,
        maxUses: 1, // Uso único estrito anti-fraude
        usedCount: 0,
        expirationDate: expirationDate.toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Salvar no Firestore
      if (db) {
        try {
          await db.collection(COLLECTIONS.COUPONS).doc(couponId).set(couponData);
        } catch (dbErr) {
          console.warn("Aviso ao salvar cupom no Firestore:", dbErr);
        }
      }

      // 2. Salvar no Prisma (PostgreSQL)
      try {
        await prisma.coupon.create({
          data: {
            id: couponId,
            tenantId: cleanTenantId,
            code: rawCode,
            discountType: discountInfo.type,
            discountValue: discountInfo.value,
            maxUses: 1,
            usedCount: 0,
            expirationDate,
            isActive: true,
          },
        });
      } catch (prismaErr) {
        console.warn("Aviso ao salvar cupom no Prisma:", prismaErr);
      }

      generatedCoupon = couponData;
    }

    return NextResponse.json({
      success: true,
      prize: { id: prizeId, name: cleanPrizeName },
      coupon: generatedCoupon
        ? {
            code: generatedCoupon.code,
            discountType: generatedCoupon.discountType,
            discountValue: generatedCoupon.discountValue,
            expirationDate: generatedCoupon.expirationDate,
            maxUses: generatedCoupon.maxUses,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Erro no processamento do giro da Roleta:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro interno ao girar a roleta." },
      { status: 500 }
    );
  }
}
