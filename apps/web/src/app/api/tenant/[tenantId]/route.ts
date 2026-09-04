import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import type { Tenant, TenantCategory } from "@/lib/types";

type Params = { params: Promise<{ tenantId: string }> };

const CATEGORIES: TenantCategory[] = [
  "BARBEARIA",
  "RESTAURANTE",
  "CLINICA",
  "ACADEMIA",
  "VAREJO",
  "OUTRO",
];

/** Perfil e identidade visual do estabelecimento, usados nos overlays da tela. */
export async function GET(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const doc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
  if (!doc.exists) {
    return NextResponse.json({ success: false, error: "Estabelecimento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    tenant: { id: doc.id, ...(doc.data() as Omit<Tenant, "id">) },
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 100);
  if (CATEGORIES.includes(body.category)) patch.category = body.category;
  if (/^#[0-9a-fA-F]{6}$/.test(String(body.primaryColor))) patch.primaryColor = body.primaryColor;
  if (typeof body.logoUrl === "string") patch.logoUrl = body.logoUrl.slice(0, 500) || null;
  if (typeof body.timezone === "string" && body.timezone.trim()) patch.timezone = body.timezone.trim();
  if (typeof body.contactWhatsapp === "string") patch.contactWhatsapp = body.contactWhatsapp.slice(0, 30);

  await db.collection(COLLECTIONS.TENANTS).doc(tenantId).set(sanitizeForFirestore(patch), { merge: true });

  const doc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
  return NextResponse.json({
    success: true,
    tenant: { id: doc.id, ...(doc.data() as Omit<Tenant, "id">) },
    message: "Dados do estabelecimento salvos.",
  });
}
