import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";

// Helper de higienização simples contra XSS
function sanitizeText(str?: string): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
        .collection(COLLECTIONS.PRODUCTS)
        .where("tenantId", "==", cleanTenantId)
        .get();

      if (!snapshot.empty) {
        const products = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        return NextResponse.json({ success: true, products });
      }
    }
  } catch (err: any) {
    console.error("Erro ao buscar produtos:", err);
  }

  return NextResponse.json({ success: true, products: [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const cleanTenantId = sanitizeText(tenantId);

  try {
    const body = await request.json();
    const { name, category, price, stockQty, description, imageUrl } = body;

    const cleanName = sanitizeText(name);
    const numPrice = Number(price);

    if (!cleanName || isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json(
        { success: false, error: "Nome válido e preço não-negativo são obrigatórios." },
        { status: 400 }
      );
    }

    const productId = `prod_${Date.now()}`;
    const newProduct = {
      id: productId,
      tenantId: cleanTenantId,
      name: cleanName,
      category: sanitizeText(category) || "Geral",
      price: Math.max(0, numPrice),
      stockQty: Math.max(0, Math.floor(Number(stockQty) || 0)),
      description: sanitizeText(description),
      imageUrl: (imageUrl || "").trim() || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection(COLLECTIONS.PRODUCTS).doc(productId).set(newProduct);
    }

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: "Produto cadastrado com sucesso!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao salvar produto." },
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
    const { productId, name, category, price, stockQty, description, imageUrl, active, deltaStock } = body;

    const cleanProductId = sanitizeText(productId);
    if (!cleanProductId) {
      return NextResponse.json({ success: false, error: "productId é obrigatório." }, { status: 400 });
    }

    if (db) {
      const docRef = db.collection(COLLECTIONS.PRODUCTS).doc(cleanProductId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        const existing = doc.data() || {};

        // Validar que o produto pertence ao tenant correto (Prevenção de IDOR)
        if (existing.tenantId && existing.tenantId !== cleanTenantId) {
          return NextResponse.json({ success: false, error: "Acesso negado para este produto." }, { status: 403 });
        }

        let newStock = existing.stockQty ?? 0;

        if (typeof deltaStock === "number") {
          newStock = Math.max(0, newStock + deltaStock);
        } else if (typeof stockQty === "number") {
          newStock = Math.max(0, Math.floor(stockQty));
        }

        const updateData = {
          name: name !== undefined ? sanitizeText(name) : existing.name,
          category: category !== undefined ? sanitizeText(category) : existing.category,
          price: price !== undefined ? Math.max(0, Number(price)) : existing.price,
          stockQty: newStock,
          description: description !== undefined ? sanitizeText(description) : existing.description,
          imageUrl: imageUrl !== undefined ? (imageUrl || "").trim() : existing.imageUrl,
          active: active !== undefined ? Boolean(active) : existing.active,
          updatedAt: new Date().toISOString(),
        };

        await docRef.set(updateData, { merge: true });

        return NextResponse.json({
          success: true,
          product: { id: cleanProductId, ...existing, ...updateData },
          message: "Estoque/Produto atualizado com sucesso!",
        });
      }
    }

    return NextResponse.json({ success: false, error: "Produto não encontrado." }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar produto." },
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
    const productId = sanitizeText(searchParams.get("productId") || "");

    if (!productId) {
      return NextResponse.json({ success: false, error: "productId é obrigatório." }, { status: 400 });
    }

    if (db) {
      const docRef = db.collection(COLLECTIONS.PRODUCTS).doc(productId);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        // IDOR Check
        if (data?.tenantId && data.tenantId !== cleanTenantId) {
          return NextResponse.json({ success: false, error: "Acesso negado para excluir este produto." }, { status: 403 });
        }
        await docRef.delete();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Produto excluído com sucesso!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Erro ao excluir produto." },
      { status: 500 }
    );
  }
}
