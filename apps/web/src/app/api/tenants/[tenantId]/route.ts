import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

type Params = { params: Promise<{ tenantId: string }> };

/** Ativa/desativa um estabelecimento. Desativado, as telas param de servir mídia. */
export async function PUT(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const doc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
  if (!doc.exists) {
    return NextResponse.json({ success: false, error: "Estabelecimento não encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 100);

  await db.collection(COLLECTIONS.TENANTS).doc(tenantId).set(patch, { merge: true });

  return NextResponse.json({ success: true, message: "Estabelecimento atualizado." });
}

/**
 * Exclui o estabelecimento e tudo que pertence a ele: telas, playlists,
 * biblioteca de mídia, credenciais do Spotify e usuários de acesso.
 *
 * Os arquivos permanecem no bucket R2 — remova a pasta tenants/<id>/ no
 * Cloudflare se quiser liberar o armazenamento.
 */
export async function DELETE(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const doc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
  if (!doc.exists) {
    return NextResponse.json({ success: false, error: "Estabelecimento não encontrado." }, { status: 404 });
  }

  const ownedCollections = [
    COLLECTIONS.SCREENS,
    COLLECTIONS.PLAYLISTS,
    COLLECTIONS.MEDIA_ASSETS,
    COLLECTIONS.USERS,
  ];

  const snapshots = await Promise.all(
    ownedCollections.map((collection) =>
      db!.collection(collection).where("tenantId", "==", tenantId).get()
    )
  );

  const batch = db.batch();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((child) => batch.delete(child.ref)));
  batch.delete(db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId));
  batch.delete(db.collection(COLLECTIONS.TENANTS).doc(tenantId));
  await batch.commit();

  return NextResponse.json({
    success: true,
    message: "Estabelecimento e dados relacionados excluídos. Os arquivos no R2 seguem no bucket.",
  });
}
