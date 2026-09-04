import { NextResponse } from "next/server";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireTenantAccess } from "@/lib/session";
import { generateDeviceSecret, generateUniquePairingCode, getScreen } from "@/lib/screens";
import { DEFAULT_OVERLAYS, isScreenOnline, type ScreenOverlays } from "@/lib/types";

type Params = { params: Promise<{ tenantId: string; screenId: string }> };

async function loadOwnedScreen(tenantId: string, screenId: string) {
  const screen = await getScreen(screenId);
  if (!screen || screen.tenantId !== tenantId) return null;
  return screen;
}

export async function GET(request: Request, { params }: Params) {
  const { tenantId, screenId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  const screen = await loadOwnedScreen(tenantId, screenId);
  if (!screen) {
    return NextResponse.json({ success: false, error: "Tela não encontrada." }, { status: 404 });
  }

  const { deviceSecret: _secret, ...rest } = screen;
  return NextResponse.json({
    success: true,
    screen: {
      ...rest,
      overlays: { ...DEFAULT_OVERLAYS, ...(screen.overlays || {}) },
      online: isScreenOnline(screen.lastSeenAt),
    },
  });
}

/** Atualiza a tela. Aceita apenas os campos editáveis pelo painel. */
export async function PUT(request: Request, { params }: Params) {
  const { tenantId, screenId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const screen = await loadOwnedScreen(tenantId, screenId);
  if (!screen) {
    return NextResponse.json({ success: false, error: "Tela não encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body.location === "string") patch.location = body.location.slice(0, 120);
  if (body.orientation === "PORTRAIT" || body.orientation === "LANDSCAPE") {
    patch.orientation = body.orientation;
  }
  if (typeof body.musicEnabled === "boolean") patch.musicEnabled = body.musicEnabled;
  if (body.volumePercent !== undefined) {
    patch.volumePercent = Math.max(0, Math.min(100, Number(body.volumePercent) || 0));
  }
  if (body.playlistId !== undefined) {
    patch.playlistId = body.playlistId ? String(body.playlistId) : null;
  }

  if (body.overlays && typeof body.overlays === "object") {
    const incoming = body.overlays as Partial<ScreenOverlays>;
    const current = { ...DEFAULT_OVERLAYS, ...(screen.overlays || {}) };
    patch.overlays = {
      showClock: incoming.showClock ?? current.showClock,
      showLogo: incoming.showLogo ?? current.showLogo,
      showNowPlaying: incoming.showNowPlaying ?? current.showNowPlaying,
      ctaEnabled: incoming.ctaEnabled ?? current.ctaEnabled,
      ctaTitle: String(incoming.ctaTitle ?? current.ctaTitle).slice(0, 90),
      ctaSubtitle: String(incoming.ctaSubtitle ?? current.ctaSubtitle).slice(0, 160),
      ctaUrl: String(incoming.ctaUrl ?? current.ctaUrl).slice(0, 400),
      ctaIntervalMinutes: Math.max(1, Math.min(120, Number(incoming.ctaIntervalMinutes ?? current.ctaIntervalMinutes))),
      ctaDurationSeconds: Math.max(3, Math.min(120, Number(incoming.ctaDurationSeconds ?? current.ctaDurationSeconds))),
    };
  }

  // Desvincular gera novo código e novo segredo: a TV antiga perde o acesso.
  if (body.action === "unpair") {
    patch.paired = false;
    patch.pairedAt = null;
    patch.spotifyDeviceId = null;
    patch.deviceSecret = generateDeviceSecret();
    patch.pairingCode = await generateUniquePairingCode();
  }

  await db.collection(COLLECTIONS.SCREENS).doc(screenId).set(sanitizeForFirestore(patch), { merge: true });

  const updated = await loadOwnedScreen(tenantId, screenId);
  const { deviceSecret: _secret, ...rest } = updated!;
  return NextResponse.json({
    success: true,
    screen: { ...rest, online: isScreenOnline(rest.lastSeenAt) },
    message: body.action === "unpair" ? "Tela desvinculada. Use o novo código para parear novamente." : "Tela atualizada.",
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { tenantId, screenId } = await params;
  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const screen = await loadOwnedScreen(tenantId, screenId);
  if (!screen) {
    return NextResponse.json({ success: false, error: "Tela não encontrada." }, { status: 404 });
  }

  await db.collection(COLLECTIONS.SCREENS).doc(screenId).delete();
  return NextResponse.json({ success: true, message: "Tela removida." });
}
