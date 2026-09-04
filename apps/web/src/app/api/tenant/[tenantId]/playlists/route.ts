import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import type { Playlist } from "@/lib/types";

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) return NextResponse.json({ success: true, playlists: [] });

  const snapshot = await db
    .collection(COLLECTIONS.PLAYLISTS)
    .where("tenantId", "==", tenantId)
    .get();

  const playlists = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Playlist, "id">) }))
    .map((playlist) => ({ ...playlist, items: playlist.items || [] }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name, "pt-BR"));

  return NextResponse.json({ success: true, playlists });
}

export async function POST(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Dê um nome para a playlist." },
      { status: 400 }
    );
  }

  // A primeira playlist do estabelecimento vira a padrão das telas sem escolha.
  const existing = await db
    .collection(COLLECTIONS.PLAYLISTS)
    .where("tenantId", "==", tenantId)
    .limit(1)
    .get();

  const now = new Date().toISOString();
  const playlist: Omit<Playlist, "id"> = {
    tenantId,
    name: name.slice(0, 80),
    isDefault: existing.empty,
    items: [],
    createdAt: now,
    updatedAt: now,
  };

  const doc = await db.collection(COLLECTIONS.PLAYLISTS).add(sanitizeForFirestore(playlist));
  return NextResponse.json({ success: true, playlist: { id: doc.id, ...playlist } });
}
