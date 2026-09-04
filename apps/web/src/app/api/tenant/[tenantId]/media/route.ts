import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import { deleteFileFromR2, resolveMediaType } from "@/lib/r2";
import type { MediaAsset } from "@/lib/types";

type Params = { params: Promise<{ tenantId: string }> };

/** Biblioteca de mídias do estabelecimento armazenadas no Cloudflare R2. */
export async function GET(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) return NextResponse.json({ success: true, assets: [] });

  const snapshot = await db
    .collection(COLLECTIONS.MEDIA_ASSETS)
    .where("tenantId", "==", tenantId)
    .get();

  const assets = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<MediaAsset, "id">) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ success: true, assets });
}

/**
 * Registra na biblioteca um arquivo que o navegador já enviou ao R2 pela URL
 * presignada. O servidor confia na chave, mas valida o tipo declarado.
 */
export async function POST(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const url = String(body.url || "");
  const r2Key = String(body.r2Key || "");
  const mimeType = String(body.mimeType || "");
  const mediaType = resolveMediaType(mimeType);

  if (!url || !r2Key) {
    return NextResponse.json(
      { success: false, error: "Upload incompleto: url e chave do arquivo são obrigatórias." },
      { status: 400 }
    );
  }

  if (!mediaType) {
    return NextResponse.json(
      { success: false, error: `Formato não suportado: ${mimeType || "desconhecido"}.` },
      { status: 400 }
    );
  }

  // A chave sempre começa com o prefixo do estabelecimento que a gerou.
  if (!r2Key.startsWith(`tenants/${tenantId}/`)) {
    return NextResponse.json(
      { success: false, error: "Arquivo não pertence a este estabelecimento." },
      { status: 403 }
    );
  }

  const asset: Omit<MediaAsset, "id"> = {
    tenantId,
    title: String(body.title || "Nova mídia").slice(0, 120),
    type: mediaType,
    url,
    r2Key,
    mimeType,
    sizeBytes: Number(body.sizeBytes) || 0,
    durationSeconds: body.durationSeconds ? Math.round(Number(body.durationSeconds)) : undefined,
    createdAt: new Date().toISOString(),
  };

  const doc = await db.collection(COLLECTIONS.MEDIA_ASSETS).add(sanitizeForFirestore(asset));
  return NextResponse.json({ success: true, asset: { id: doc.id, ...asset } });
}

/** Remove a mídia da biblioteca e apaga o objeto no R2. */
export async function DELETE(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId") || "";
  if (!assetId) {
    return NextResponse.json({ success: false, error: "Informe o assetId." }, { status: 400 });
  }

  const docRef = db.collection(COLLECTIONS.MEDIA_ASSETS).doc(assetId);
  const doc = await docRef.get();
  const asset = doc.exists ? (doc.data() as MediaAsset) : null;

  if (!asset || asset.tenantId !== tenantId) {
    return NextResponse.json({ success: false, error: "Mídia não encontrada." }, { status: 404 });
  }

  let storageWarning: string | null = null;
  try {
    await deleteFileFromR2(asset.r2Key);
  } catch (error) {
    // O registro sai da biblioteca mesmo assim; o objeto órfão fica sinalizado.
    console.error("Erro ao excluir objeto no R2:", error);
    storageWarning = "A mídia saiu da biblioteca, mas o arquivo segue no R2. Verifique no Cloudflare.";
  }

  await docRef.delete();

  return NextResponse.json({
    success: true,
    message: storageWarning || "Mídia excluída da biblioteca e do R2.",
    storageWarning,
  });
}
