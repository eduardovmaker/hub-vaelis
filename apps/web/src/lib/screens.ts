import crypto from "crypto";
import { db, COLLECTIONS, sanitizeForFirestore } from "./db";
import { getSpotifyAccount } from "./spotify";
import {
  DEFAULT_OVERLAYS,
  type Playlist,
  type PlaylistItem,
  type Screen,
  type ScreenBootstrap,
  type Tenant,
} from "./types";

/**
 * Ciclo de vida de uma tela: geração do código de pareamento, autenticação do
 * player pelo segredo do dispositivo e montagem do payload de exibição.
 */

// Sem I, O, 0 e 1: o código é digitado no controle remoto da TV.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function generateDeviceSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Gera um código que ainda não está em uso por outra tela. */
export async function generateUniquePairingCode(): Promise<string> {
  if (!db) return generatePairingCode();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generatePairingCode();
    const existing = await db
      .collection(COLLECTIONS.SCREENS)
      .where("pairingCode", "==", code)
      .limit(1)
      .get();
    if (existing.empty) return code;
  }
  // Improvável: cai para um código mais longo em vez de falhar.
  return generatePairingCode(8);
}

export async function getScreen(screenId: string): Promise<Screen | null> {
  if (!db) return null;
  const doc = await db.collection(COLLECTIONS.SCREENS).doc(screenId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Screen, "id">) };
}

export async function findScreenByPairingCode(code: string): Promise<Screen | null> {
  if (!db) return null;
  const snapshot = await db
    .collection(COLLECTIONS.SCREENS)
    .where("pairingCode", "==", code.trim().toUpperCase())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<Screen, "id">) };
}

/**
 * Valida o segredo enviado pelo player. Comparação em tempo constante para
 * não vazar o segredo por diferença de tempo de resposta.
 */
export function isValidDeviceSecret(screen: Screen, provided: string | null): boolean {
  if (!provided || !screen.deviceSecret) return false;
  const expected = Buffer.from(screen.deviceSecret);
  const received = Buffer.from(provided);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

/** Extrai o segredo do dispositivo do header ou da query string. */
export function readDeviceSecret(request: Request): string | null {
  const header = request.headers.get("x-device-secret");
  if (header) return header.trim();
  const { searchParams } = new URL(request.url);
  return searchParams.get("secret");
}

export async function authenticateScreen(
  screenId: string,
  request: Request
): Promise<{ screen: Screen } | { error: string; status: number }> {
  const screen = await getScreen(screenId);
  if (!screen) return { error: "Tela não encontrada.", status: 404 };

  if (!isValidDeviceSecret(screen, readDeviceSecret(request))) {
    return { error: "Dispositivo não autorizado. Refaça o pareamento da tela.", status: 401 };
  }
  return { screen };
}

async function getTenant(tenantId: string): Promise<Tenant | null> {
  if (!db) return null;
  const doc = await db.collection(COLLECTIONS.TENANTS).doc(tenantId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Tenant, "id">) };
}

async function getPlaylistItems(
  tenantId: string,
  playlistId?: string
): Promise<PlaylistItem[]> {
  if (!db) return [];

  let playlist: Playlist | null = null;

  if (playlistId) {
    const doc = await db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId).get();
    if (doc.exists) {
      const data = doc.data() as Omit<Playlist, "id">;
      // Não serve playlist de outro estabelecimento, mesmo se o id for válido.
      if (data.tenantId === tenantId) playlist = { id: doc.id, ...data };
    }
  }

  if (!playlist) {
    // Tela sem playlist escolhida cai na playlist padrão do estabelecimento.
    const snapshot = await db
      .collection(COLLECTIONS.PLAYLISTS)
      .where("tenantId", "==", tenantId)
      .where("isDefault", "==", true)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      playlist = { id: doc.id, ...(doc.data() as Omit<Playlist, "id">) };
    }
  }

  if (!playlist) return [];

  return (playlist.items || [])
    .filter((item) => item.active && item.url)
    .sort((a, b) => a.order - b.order);
}

/** Payload completo que a tela consome para se desenhar e tocar. */
export async function loadScreenBootstrap(screen: Screen): Promise<ScreenBootstrap> {
  const [tenant, playlist, spotify] = await Promise.all([
    getTenant(screen.tenantId),
    getPlaylistItems(screen.tenantId, screen.playlistId),
    getSpotifyAccount(screen.tenantId),
  ]);

  return {
    screen: {
      id: screen.id,
      tenantId: screen.tenantId,
      name: screen.name,
      orientation: screen.orientation || "LANDSCAPE",
      overlays: { ...DEFAULT_OVERLAYS, ...(screen.overlays || {}) },
      musicEnabled: screen.musicEnabled !== false,
      volumePercent: screen.volumePercent ?? 45,
    },
    tenant: {
      id: screen.tenantId,
      name: tenant?.name || screen.name,
      primaryColor: tenant?.primaryColor || "#2563EB",
      logoUrl: tenant?.logoUrl,
      timezone: tenant?.timezone || "America/Sao_Paulo",
    },
    playlist,
    music: {
      enabled: screen.musicEnabled !== false,
      connected: !!spotify?.connected,
      contextUri: spotify?.contextUri || "",
      playlistName: spotify?.playlistName || "",
      shuffle: spotify?.shuffle !== false,
    },
  };
}

/** Registra presença da tela e, quando informado, o device do Spotify. */
export async function touchScreen(
  screenId: string,
  patch: { spotifyDeviceId?: string } = {}
): Promise<void> {
  if (!db) return;
  await db
    .collection(COLLECTIONS.SCREENS)
    .doc(screenId)
    .set(
      sanitizeForFirestore({
        lastSeenAt: new Date().toISOString(),
        ...patch,
      }),
      { merge: true }
    );
}
