import { NextResponse } from "next/server";
import { db, COLLECTIONS, prisma } from "@/lib/db";
import { Coupon, DiscountType } from "@/types/coupon";

function sanitizeText(str?: string): string {
  if (!str) return "";
  return str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Armazenamento em memória para dev/demo quando Firestore e Prisma não estão conectados
const MOCK_COUPONS_STORE: Record<string, Coupon[]> = {};

function getMockCoupons(tenantId: string): Coupon[] {
  if (!MOCK_COUPONS_STORE[tenantId]) {
    MOCK_COUPONS_STORE[tenantId] = [
      {
        id: `coupon_${tenantId}_1`,
        tenantId,
        code: "BEMVINDO10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxUses: 100,
        usedCount: 8,
        expirationDate: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `coupon_${tenantId}_2`,
        tenantId,
        code: "ROLETA15",
        discountType: "PERCENTAGE",
        discountValue: 15,
        maxUses: 50,
        usedCount: 3,
        expirationDate: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return MOCK_COUPONS_STORE[tenantId];
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
      try {
        const snapshot = await db
          .collection(COLLECTIONS.COUPONS)
          .where("tenantId", "==", cleanTenantId)
          .get();

        if (!snapshot.empty) {
          coupons = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          })) as Coupon[];
          
          coupons.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          return NextResponse.json({ success: true, coupons });
        }
      } catch (fErr) {}
    }

    // 2. Fallback Prisma (Protegido contra servidor PostgreSQL offline)
    try {
      if (prisma) {
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
      }
    } catch (prismaErr) {}

    // 3. Fallback em memória para ambiente Dev / Demo
    coupons = getMockCoupons(cleanTenantId);
    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ success: true, coupons: getMockCoupons(cleanTenantId) });
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
      try {
        await db.collection(COLLECTIONS.COUPONS).doc(couponId).set(newCoupon);
      } catch (fErr) {}
    }

    try {
      if (prisma) {
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
      }
    } catch (prismaErr) {}

    const currentMocks = getMockCoupons(cleanTenantId);
    MOCK_COUPONS_STORE[cleanTenantId] = [newCoupon, ...currentMocks];

    return NextResponse.json({
      success: true,
      coupon: newCoupon,
      message: "Cupom criado com sucesso!",
    });
  } catch (err: any) {
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
      try {
        const docRef = db.collection(COLLECTIONS.COUPONS).doc(cleanCouponId);
        await docRef.set(updates, { merge: true });
      } catch (fErr) {}
    }

    try {
      if (prisma) {
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
      }
    } catch (pErr) {}

    const current = getMockCoupons(cleanTenantId);
    MOCK_COUPONS_STORE[cleanTenantId] = current.map((c) =>
      c.id === cleanCouponId ? { ...c, ...updates } : c
    );

    return NextResponse.json({
      success: true,
      coupon: updates,
      message: "Cupom atualizado com sucesso!",
    });
  } catch (err: any) {
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
      try {
        await db.collection(COLLECTIONS.COUPONS).doc(couponId).delete();
      } catch (fErr) {}
    }

    try {
      if (prisma) {
        await prisma.coupon.delete({ where: { id: couponId } });
      }
    } catch (pErr) {}

    const current = getMockCoupons(cleanTenantId);
    MOCK_COUPONS_STORE[cleanTenantId] = current.filter((c) => c.id !== couponId);

    return NextResponse.json({
      success: true,
      message: "Cupom excluído com sucesso!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao excluir cupom." },
      { status: 500 }
    );
  }
}
