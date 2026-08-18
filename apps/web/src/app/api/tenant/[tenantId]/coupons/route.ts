import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";
import { Coupon, DiscountType } from "@/types/coupon";

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
    let coupons: Coupon[] = [];

    // 1. Tentar Firestore
    if (db) {
      const snapshot = await db
        .collection(COLLECTIONS.COUPONS)
        .where("tenantId", "==", cleanTenantId)
        .get();

      if (!snapshot.empty) {
        coupons = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        })) as Coupon[];
        
        // Ordenar por data de criação mais recente
        coupons.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        return NextResponse.json({ success: true, coupons });
      }
    }

    // 2. Fallback Prisma
    try {
      const prismaCoupons = await prisma.coupon.findMany({
        where: { tenantId: cleanTenantId },
        orderBy: { createdAt: "desc" },
      });

      if (prismaCoupons && prismaCoupons.length > 0) {
        return NextResponse.json({
          success: true,
          coupons: prismaCoupons.map((c) => ({
            ...c,
            expirationDate: c.expirationDate ? c.expirationDate.toISOString() : null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
        });
      }
    } catch (prismaErr) {
      console.warn("Aviso Prisma ao buscar cupons:", prismaErr);
    }

    return NextResponse.json({ success: true, coupons: [] });
  } catch (err: any) {
    console.error("Erro ao buscar cupons:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar cupons." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  try {
    const body = await request.json();
    const { code, discountType, discountValue, maxUses, expirationDate, isActive } = body;

    const rawCode = sanitizeText(code).toUpperCase().replace(/\s+/g, "");
    const type: DiscountType = discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    const numValue = Number(discountValue);

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: "O código do cupom é obrigatório." },
        { status: 400 }
      );
    }

    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json(
        { success: false, error: "Informe um valor de desconto válido e maior que zero." },
        { status: 400 }
      );
    }

    if (type === "PERCENTAGE" && numValue > 100) {
      return NextResponse.json(
        { success: false, error: "O desconto em porcentagem não pode ser maior que 100%." },
        { status: 400 }
      );
    }

    // Verificar se já existe um cupom com este código para este tenant (evitar duplicatas)
    if (db) {
      const existingDoc = await db
        .collection(COLLECTIONS.COUPONS)
        .where("tenantId", "==", cleanTenantId)
        .where("code", "==", rawCode)
        .get();

      if (!existingDoc.empty) {
        return NextResponse.json(
          { success: false, error: `Já existe um cupom com o código '${rawCode}' para esta loja.` },
          { status: 400 }
        );
      }
    }

    const couponId = `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const parsedMaxUses = maxUses !== undefined && maxUses !== null && maxUses !== "" ? Number(maxUses) : null;
    
    const newCoupon: Coupon = {
      id: couponId,
      tenantId: cleanTenantId,
      code: rawCode,
      discountType: type,
      discountValue: numValue,
      maxUses: parsedMaxUses,
      usedCount: 0,
      expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection(COLLECTIONS.COUPONS).doc(couponId).set(newCoupon);
    }

    // Tentar salvar no Prisma em paralelo
    try {
      await prisma.coupon.create({
        data: {
          id: couponId,
          tenantId: cleanTenantId,
          code: rawCode,
          discountType: type,
          discountValue: numValue,
          maxUses: parsedMaxUses,
          usedCount: 0,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          isActive: newCoupon.isActive,
        },
      });
    } catch (prismaErr) {
      console.warn("Aviso ao salvar cupom no Prisma:", prismaErr);
    }

    return NextResponse.json({
      success: true,
      coupon: newCoupon,
      message: "Cupom criado com sucesso!",
    });
  } catch (err: any) {
    console.error("Erro ao criar cupom:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao criar cupom." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  try {
    const body = await request.json();
    const { couponId, code, discountType, discountValue, maxUses, expirationDate, isActive } = body;

    const cleanCouponId = sanitizeText(couponId);
    if (!cleanCouponId) {
      return NextResponse.json(
        { success: false, error: "couponId é obrigatório." },
        { status: 400 }
      );
    }

    const updates: Partial<Coupon> = {
      updatedAt: new Date().toISOString(),
    };

    if (code !== undefined) {
      updates.code = sanitizeText(code).toUpperCase().replace(/\s+/g, "");
    }
    if (discountType !== undefined) {
      updates.discountType = discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    }
    if (discountValue !== undefined) {
      updates.discountValue = Math.max(0, Number(discountValue));
    }
    if (maxUses !== undefined) {
      updates.maxUses = maxUses !== null && maxUses !== "" ? Number(maxUses) : null;
    }
    if (expirationDate !== undefined) {
      updates.expirationDate = expirationDate ? new Date(expirationDate).toISOString() : null;
    }
    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (db) {
      const docRef = db.collection(COLLECTIONS.COUPONS).doc(cleanCouponId);
      const doc = await docRef.get();

      if (doc.exists) {
        const existing = doc.data() as Coupon;
        if (existing.tenantId && existing.tenantId !== cleanTenantId) {
          return NextResponse.json(
            { success: false, error: "Acesso negado para este cupom." },
            { status: 403 }
          );
        }

        await docRef.set(updates, { merge: true });

        // Atualizar Prisma
        try {
          await prisma.coupon.update({
            where: { id: cleanCouponId },
            data: {
              ...(updates.code ? { code: updates.code } : {}),
              ...(updates.discountType ? { discountType: updates.discountType } : {}),
              ...(updates.discountValue !== undefined ? { discountValue: updates.discountValue } : {}),
              ...(updates.maxUses !== undefined ? { maxUses: updates.maxUses } : {}),
              ...(updates.expirationDate !== undefined ? { expirationDate: updates.expirationDate ? new Date(updates.expirationDate) : null } : {}),
              ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
            },
          });
        } catch (pErr) {
          console.warn("Aviso ao atualizar Prisma:", pErr);
        }

        return NextResponse.json({
          success: true,
          coupon: { ...existing, ...updates },
          message: "Cupom atualizado com sucesso!",
        });
      }
    }

    return NextResponse.json(
      { success: false, error: "Cupom não encontrado." },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Erro ao atualizar cupom:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar cupom." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  try {
    const { searchParams } = new URL(request.url);
    const couponId = sanitizeText(searchParams.get("couponId") || "");

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: "couponId é obrigatório." },
        { status: 400 }
      );
    }

    if (db) {
      const docRef = db.collection(COLLECTIONS.COUPONS).doc(couponId);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data() as Coupon;
        if (data?.tenantId && data.tenantId !== cleanTenantId) {
          return NextResponse.json(
            { success: false, error: "Acesso negado para excluir este cupom." },
            { status: 403 }
          );
        }
        await docRef.delete();
      }
    }

    try {
      await prisma.coupon.delete({ where: { id: couponId } });
    } catch (pErr) {
      console.warn("Aviso ao excluir cupom do Prisma:", pErr);
    }

    return NextResponse.json({
      success: true,
      message: "Cupom excluído com sucesso!",
    });
  } catch (err: any) {
    console.error("Erro ao excluir cupom:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir cupom." },
      { status: 500 }
    );
  }
}
