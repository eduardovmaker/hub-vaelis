import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";
import { Coupon } from "@/types/coupon";

function sanitizeText(str?: string): string {
  if (!str) return "";
  return str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = sanitizeText(searchParams.get("tenantId") || "");
    const code = sanitizeText(searchParams.get("code") || "").toUpperCase().replace(/\s+/g, "");
    const rawAmount = searchParams.get("amount");
    const amount = rawAmount ? Math.max(0, Number(rawAmount)) : 0;

    if (!tenantId || !code) {
      return NextResponse.json(
        { valid: false, message: "Informe a loja (tenantId) e o código do cupom." },
        { status: 400 }
      );
    }

    let coupon: Coupon | null = null;

    // 1. Buscar no Firestore
    if (db) {
      const snapshot = await db
        .collection(COLLECTIONS.COUPONS)
        .where("tenantId", "==", tenantId)
        .where("code", "==", code)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        coupon = { id: doc.id, ...doc.data() } as Coupon;
      }
    }

    // 2. Fallback Prisma se não encontrou no Firestore
    if (!coupon) {
      try {
        const prismaCoupon = await prisma.coupon.findFirst({
          where: { tenantId, code },
        });

        if (prismaCoupon) {
          coupon = {
            ...prismaCoupon,
            expirationDate: prismaCoupon.expirationDate ? prismaCoupon.expirationDate.toISOString() : null,
            createdAt: prismaCoupon.createdAt.toISOString(),
            updatedAt: prismaCoupon.updatedAt.toISOString(),
          } as Coupon;
        }
      } catch (pErr) {
        console.warn("Aviso ao validar cupom via Prisma:", pErr);
      }
    }

    if (!coupon) {
      return NextResponse.json(
        { valid: false, message: "Cupom não encontrado ou inválido." },
        { status: 404 }
      );
    }

    // Validação 1: Ativo
    if (!coupon.isActive) {
      return NextResponse.json(
        { valid: false, message: "Este cupom de desconto está inativo." },
        { status: 400 }
      );
    }

    // Validação 2: Expiração
    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return NextResponse.json(
        { valid: false, message: "Este cupom de desconto expirou." },
        { status: 400 }
      );
    }

    // Validação 3: Limite de usos
    if (
      coupon.maxUses !== null &&
      coupon.maxUses !== undefined &&
      coupon.usedCount >= coupon.maxUses
    ) {
      return NextResponse.json(
        { valid: false, message: "Este cupom atingiu o limite máximo de utilizações." },
        { status: 400 }
      );
    }

    // Cálculo seguro do Desconto
    let calculatedDiscount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      calculatedDiscount = (amount * coupon.discountValue) / 100;
    } else {
      calculatedDiscount = coupon.discountValue;
    }

    // Garantir que o desconto não exceda o valor total do carrinho
    calculatedDiscount = Math.min(amount, Math.max(0, calculatedDiscount));
    const finalTotal = Math.max(0, amount - calculatedDiscount);

    return NextResponse.json({
      valid: true,
      message: "Cupom aplicado com sucesso!",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        calculatedDiscount: Number(calculatedDiscount.toFixed(2)),
        finalTotal: Number(finalTotal.toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error("Erro ao validar cupom:", err);
    return NextResponse.json(
      { valid: false, message: "Erro ao validar cupom." },
      { status: 500 }
    );
  }
}
