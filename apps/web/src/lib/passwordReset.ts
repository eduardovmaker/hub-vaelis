import crypto from "crypto";
import { db, COLLECTIONS } from "./db";

/**
 * Tokens de redefinição de senha.
 *
 * O token vai por e-mail em texto puro, mas no banco guardamos apenas o seu
 * hash SHA-256 — quem tiver acesso ao Firestore não consegue reaproveitá-lo.
 * O hash também é o id do documento, o que dá busca direta sem índice.
 */

export const RESET_TOKEN_TTL_MINUTES = 60;

/** Tamanho mínimo aceito ao criar uma nova senha. */
export const MIN_PASSWORD_LENGTH = 8;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface PasswordResetRecord {
  userId: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

/** Cria um token de uso único e devolve o valor que vai no link do e-mail. */
export async function createPasswordResetToken(params: {
  userId: string;
  email: string;
}): Promise<string | null> {
  if (!db) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const record: PasswordResetRecord = {
    userId: params.userId,
    email: params.email,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
    usedAt: null,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.PASSWORD_RESETS).doc(hashToken(token)).set(record);
  return token;
}

export type ResetTokenCheck =
  | { valid: true; userId: string; email: string; tokenHash: string }
  | { valid: false; reason: string };

/** Confere validade sem consumir — usado ao abrir a tela de nova senha. */
export async function inspectPasswordResetToken(token: string): Promise<ResetTokenCheck> {
  if (!db) return { valid: false, reason: "Serviço indisponível no momento." };
  if (!token) return { valid: false, reason: "Link de redefinição inválido." };

  const tokenHash = hashToken(token);
  const doc = await db.collection(COLLECTIONS.PASSWORD_RESETS).doc(tokenHash).get();

  if (!doc.exists) {
    return { valid: false, reason: "Link inválido ou já utilizado. Peça um novo." };
  }

  const record = doc.data() as PasswordResetRecord;

  if (record.usedAt) {
    return { valid: false, reason: "Este link já foi usado. Peça um novo." };
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "Este link expirou. Peça um novo." };
  }

  return { valid: true, userId: record.userId, email: record.email, tokenHash };
}

/**
 * Marca o token como usado e descarta os demais tokens daquele usuário: um
 * pedido novo invalida os anteriores.
 */
export async function consumePasswordResetToken(tokenHash: string, userId: string): Promise<void> {
  if (!db) return;

  await db
    .collection(COLLECTIONS.PASSWORD_RESETS)
    .doc(tokenHash)
    .set({ usedAt: new Date().toISOString() }, { merge: true });

  const outros = await db
    .collection(COLLECTIONS.PASSWORD_RESETS)
    .where("userId", "==", userId)
    .where("usedAt", "==", null)
    .get();

  if (outros.empty) return;

  const batch = db.batch();
  outros.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
