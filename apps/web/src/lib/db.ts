import { getFirestoreDb } from "./firebase-admin";

/**
 * Instância única do Firestore. É o banco de dados da plataforma:
 * não há Postgres/Prisma neste projeto.
 */
export const db = getFirestoreDb();

/** Coleções do Firestore utilizadas pela plataforma de mídia indoor. */
export const COLLECTIONS = {
  /** Usuários do painel (super admin e administradores de estabelecimento). */
  USERS: "users",
  /** Estabelecimentos clientes (barbearias, restaurantes, clínicas...). */
  TENANTS: "tenants",
  /** Telas físicas pareadas — uma por TV/player instalado. */
  SCREENS: "screens",
  /** Playlists de exibição, com os itens de mídia embutidos. */
  PLAYLISTS: "playlists",
  /** Biblioteca de mídias enviadas ao Cloudflare R2. */
  MEDIA_ASSETS: "mediaAssets",
  /** Credenciais e preferências do Spotify, um documento por estabelecimento. */
  SPOTIFY_ACCOUNTS: "spotifyAccounts",
  /** Tokens de redefinição de senha, indexados pelo hash do token. */
  PASSWORD_RESETS: "passwordResets",
} as const;

/** Remove undefined recursivamente: o Firestore rejeita campos undefined. */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) result[key] = sanitizeForFirestore(item);
    }
    return result as T;
  }
  return value;
}

/**
 * Protege as rotas contra travamento quando o Firestore está lento ou sem
 * credenciais configuradas: melhor devolver o fallback do que pendurar a TV.
 */
export async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 4000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Firestore timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
