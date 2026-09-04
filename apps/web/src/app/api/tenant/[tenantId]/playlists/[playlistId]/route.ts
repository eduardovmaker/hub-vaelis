import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import type { Playlist, PlaylistItem } from "@/lib/types";

type Params = { params: Promise<{ tenantId: string; playlistId: string }> };

async function loadOwnedPlaylist(tenantId: string, playlistId: string): Promise<Playlist | null> {
  if (!db) return null;
  const doc = await db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId).get();
  if (!doc.exists) return null;
  const data = doc.data() as Omit<Playlist, "id">;
  if (data.tenantId !== tenantId) return null;
  return { id: doc.id, ...data, items: data.items || [] };
}

/** Normaliza os itens vindos do painel e reordena de forma contígua. */
function normalizeItems(raw: unknown): PlaylistItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry, index) => {
      const type = entry.type === "video" ? "video" : "image";
      // Vídeo toca até o fim; a duração só governa imagens.
      const duration = Math.max(3, Math.min(600, Number(entry.durationSeconds) || 10));

      return {
        id: String(entry.id || crypto.randomUUID()),
        assetId: entry.assetId ? String(entry.assetId) : undefined,
        title: String(entry.title || "Sem título").slice(0, 120),
        type,
        url: String(entry.url || ""),
        durationSeconds: duration,
        active: entry.active !== false,
        muteAudio: entry.muteAudio !== false,
        order: index + 1,
      } satisfies PlaylistItem;
    })
    .filter((item) => !!item.url);
}

export async function GET(request: Request, { params }: Params) {
  const { tenantId, playlistId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  const playlist = await loadOwnedPlaylist(tenantId, playlistId);
  if (!playlist) {
    return NextResponse.json({ success: false, error: "Playlist não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ success: true, playlist });
}

/** Renomeia, marca como padrão ou substitui a lista de itens. */
export async function PUT(request: Request, { params }: Params) {
  const { tenantId, playlistId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const playlist = await loadOwnedPlaylist(tenantId, playlistId);
  if (!playlist) {
    return NextResponse.json({ success: false, error: "Playlist não encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 80);
  }
  if (body.items !== undefined) {
    patch.items = normalizeItems(body.items);
  }

  if (body.isDefault === true) {
    // Só uma playlist padrão por estabelecimento: rebaixa as outras no mesmo lote.
    const siblings = await db
      .collection(COLLECTIONS.PLAYLISTS)
      .where("tenantId", "==", tenantId)
      .where("isDefault", "==", true)
      .get();

    const batch = db.batch();
    siblings.docs
      .filter((doc) => doc.id !== playlistId)
      .forEach((doc) => batch.set(doc.ref, { isDefault: false }, { merge: true }));
    await batch.commit();

    patch.isDefault = true;
  }

  await db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId).set(sanitizeForFirestore(patch), { merge: true });

  return NextResponse.json({
    success: true,
    playlist: await loadOwnedPlaylist(tenantId, playlistId),
    message: "Playlist salva. As telas aplicam a mudança no próximo ciclo.",
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { tenantId, playlistId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const playlist = await loadOwnedPlaylist(tenantId, playlistId);
  if (!playlist) {
    return NextResponse.json({ success: false, error: "Playlist não encontrada." }, { status: 404 });
  }

  // Telas que apontavam para esta playlist voltam para a padrão.
  const screens = await db
    .collection(COLLECTIONS.SCREENS)
    .where("tenantId", "==", tenantId)
    .where("playlistId", "==", playlistId)
    .get();

  const batch = db.batch();
  screens.docs.forEach((doc) => batch.set(doc.ref, { playlistId: null }, { merge: true }));
  batch.delete(db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId));
  await batch.commit();

  return NextResponse.json({ success: true, message: "Playlist removida." });
}
