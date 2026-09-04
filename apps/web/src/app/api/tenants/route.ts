import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, COLLECTIONS, sanitizeForFirestore } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { generateDeviceSecret, generateUniquePairingCode } from "@/lib/screens";
import {
  DEFAULT_OVERLAYS,
  isScreenOnline,
  type Playlist,
  type Screen,
  type Tenant,
  type TenantCategory,
} from "@/lib/types";

const CATEGORIES: TenantCategory[] = [
  "BARBEARIA",
  "RESTAURANTE",
  "CLINICA",
  "ACADEMIA",
  "VAREJO",
  "OUTRO",
];

function slugifyTenantId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "cliente";
  return `tenant_${slug}_${Date.now().toString().slice(-4)}`;
}

/** Lista os estabelecimentos com a contagem de telas e quantas estão online. */
export async function GET(request: Request) {
  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  if (!db) return NextResponse.json({ success: true, tenants: [] });

  const [tenantsSnapshot, screensSnapshot] = await Promise.all([
    db.collection(COLLECTIONS.TENANTS).get(),
    db.collection(COLLECTIONS.SCREENS).get(),
  ]);

  const screensByTenant = new Map<string, { total: number; online: number }>();
  screensSnapshot.docs.forEach((doc) => {
    const screen = doc.data() as Screen;
    const entry = screensByTenant.get(screen.tenantId) || { total: 0, online: 0 };
    entry.total += 1;
    if (isScreenOnline(screen.lastSeenAt)) entry.online += 1;
    screensByTenant.set(screen.tenantId, entry);
  });

  const tenants = tenantsSnapshot.docs
    .map((doc) => {
      const data = doc.data() as Omit<Tenant, "id">;
      const counts = screensByTenant.get(doc.id) || { total: 0, online: 0 };
      return { id: doc.id, ...data, screenCount: counts.total, screensOnline: counts.online };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return NextResponse.json({ success: true, tenants });
}

/**
 * Cadastra um estabelecimento e já entrega o kit inicial: usuário
 * administrador, playlist padrão e a primeira tela com código de pareamento.
 */
export async function POST(request: Request) {
  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  if (!db) {
    return NextResponse.json({ success: false, error: "Banco de dados indisponível." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      {
        success: false,
        error: "Informe nome do estabelecimento, e-mail de acesso e senha com 8+ caracteres.",
      },
      { status: 400 }
    );
  }

  const existingUser = await db
    .collection(COLLECTIONS.USERS)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existingUser.empty) {
    return NextResponse.json(
      { success: false, error: "Este e-mail já está em uso por outro acesso." },
      { status: 409 }
    );
  }

  const tenantId = slugifyTenantId(name);
  const now = new Date().toISOString();

  const tenant: Omit<Tenant, "id"> = {
    name: name.slice(0, 100),
    category: CATEGORIES.includes(body.category) ? body.category : "OUTRO",
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(String(body.primaryColor)) ? body.primaryColor : "#2563EB",
    logoUrl: body.logoUrl ? String(body.logoUrl) : undefined,
    timezone: String(body.timezone || "America/Sao_Paulo"),
    contactWhatsapp: body.contactWhatsapp ? String(body.contactWhatsapp) : undefined,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const playlist: Omit<Playlist, "id"> = {
    tenantId,
    name: "Playlist principal",
    isDefault: true,
    items: [],
    createdAt: now,
    updatedAt: now,
  };

  const playlistRef = db.collection(COLLECTIONS.PLAYLISTS).doc();
  const screenRef = db.collection(COLLECTIONS.SCREENS).doc();

  const screen: Omit<Screen, "id"> = {
    tenantId,
    name: "TV principal",
    orientation: "LANDSCAPE",
    pairingCode: await generateUniquePairingCode(),
    paired: false,
    deviceSecret: generateDeviceSecret(),
    playlistId: playlistRef.id,
    overlays: { ...DEFAULT_OVERLAYS },
    musicEnabled: true,
    volumePercent: 45,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(db.collection(COLLECTIONS.TENANTS).doc(tenantId), sanitizeForFirestore(tenant));
  batch.set(playlistRef, sanitizeForFirestore(playlist));
  batch.set(screenRef, sanitizeForFirestore(screen));
  batch.set(db.collection(COLLECTIONS.USERS).doc(), {
    name: `Administrador ${tenant.name}`,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "TENANT_ADMIN",
    tenantId,
    tenantName: tenant.name,
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();

  return NextResponse.json({
    success: true,
    tenant: { id: tenantId, ...tenant },
    screen: { id: screenRef.id, name: screen.name, pairingCode: screen.pairingCode },
    message: `Estabelecimento criado. Código da primeira tela: ${screen.pairingCode}.`,
  });
}
