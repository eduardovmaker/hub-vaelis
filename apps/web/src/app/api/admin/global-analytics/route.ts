import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { isScreenOnline, type MediaAsset, type Screen, type Tenant } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Números da operação: telas no ar, clientes ativos e volume de mídia no R2. */
export async function GET(request: Request) {
  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({
      success: true,
      stats: { tenants: 0, activeTenants: 0, screens: 0, screensOnline: 0, mediaAssets: 0, storageBytes: 0 },
      offlineScreens: [],
    });
  }

  const [tenantsSnapshot, screensSnapshot, mediaSnapshot] = await Promise.all([
    db.collection(COLLECTIONS.TENANTS).get(),
    db.collection(COLLECTIONS.SCREENS).get(),
    db.collection(COLLECTIONS.MEDIA_ASSETS).get(),
  ]);

  const tenantNames = new Map<string, string>();
  let activeTenants = 0;
  tenantsSnapshot.docs.forEach((doc) => {
    const tenant = doc.data() as Tenant;
    tenantNames.set(doc.id, tenant.name);
    if (tenant.active !== false) activeTenants += 1;
  });

  const screens = screensSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Screen, "id">),
  }));

  const storageBytes = mediaSnapshot.docs.reduce(
    (total, doc) => total + (Number((doc.data() as MediaAsset).sizeBytes) || 0),
    0
  );

  // Telas pareadas mas fora do ar são o que exige ação do suporte.
  const offlineScreens = screens
    .filter((screen) => screen.paired && !isScreenOnline(screen.lastSeenAt))
    .map((screen) => ({
      id: screen.id,
      name: screen.name,
      tenantId: screen.tenantId,
      tenantName: tenantNames.get(screen.tenantId) || screen.tenantId,
      lastSeenAt: screen.lastSeenAt || null,
    }))
    .sort((a, b) => (b.lastSeenAt || "").localeCompare(a.lastSeenAt || ""));

  return NextResponse.json({
    success: true,
    stats: {
      tenants: tenantsSnapshot.size,
      activeTenants,
      screens: screens.length,
      screensOnline: screens.filter((screen) => isScreenOnline(screen.lastSeenAt)).length,
      mediaAssets: mediaSnapshot.size,
      storageBytes,
    },
    offlineScreens,
  });
}
