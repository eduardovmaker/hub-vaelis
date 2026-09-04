import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import { generateDeviceSecret, generateUniquePairingCode } from "@/lib/screens";
import { DEFAULT_OVERLAYS, isScreenOnline, type Screen } from "@/lib/types";

type Params = { params: Promise<{ tenantId: string }> };

/**
 * O `deviceSecret` nunca sai para o painel: ele pertence ao player da TV.
 * Aqui devolvemos apenas o que o painel precisa mostrar.
 */
function toPanelScreen(id: string, data: Omit<Screen, "id">) {
  const { deviceSecret: _secret, ...rest } = data;
  return {
    id,
    ...rest,
    overlays: { ...DEFAULT_OVERLAYS, ...(data.overlays || {}) },
    online: isScreenOnline(data.lastSeenAt),
  };
}

/** Lista as telas do estabelecimento com o status online de cada uma. */
export async function GET(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) return NextResponse.json({ success: true, screens: [] });

  const snapshot = await db
    .collection(COLLECTIONS.SCREENS)
    .where("tenantId", "==", tenantId)
    .get();

  const screens = snapshot.docs
    .map((doc) => toPanelScreen(doc.id, doc.data() as Omit<Screen, "id">))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return NextResponse.json({ success: true, screens });
}

/** Cria uma tela e já devolve o código que será digitado na TV. */
export async function POST(request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json(
      { success: false, error: "Banco de dados indisponível." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Dê um nome para a tela (ex: TV da recepção)." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const screen: Omit<Screen, "id"> = {
    tenantId,
    name: name.slice(0, 80),
    location: String(body.location || "").slice(0, 120) || undefined,
    orientation: body.orientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE",
    pairingCode: await generateUniquePairingCode(),
    paired: false,
    deviceSecret: generateDeviceSecret(),
    playlistId: body.playlistId ? String(body.playlistId) : undefined,
    overlays: { ...DEFAULT_OVERLAYS },
    musicEnabled: body.musicEnabled !== false,
    volumePercent: 45,
    createdAt: now,
    updatedAt: now,
  };

  const doc = await db.collection(COLLECTIONS.SCREENS).add(sanitizeForFirestore(screen));

  return NextResponse.json({
    success: true,
    screen: toPanelScreen(doc.id, screen),
    message: `Tela criada. Digite o código ${screen.pairingCode} no player da TV para vincular.`,
  });
}
