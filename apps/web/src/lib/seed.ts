import bcrypt from "bcryptjs";
import { loadEnvFile } from "./env";
import { getFirestoreDb } from "./firebase-admin";
import { COLLECTIONS } from "./db";

/**
 * Cria o usuário super admin da plataforma.
 *
 * Executar com: npm run seed
 *
 * É idempotente: rodar de novo apenas atualiza a senha do admin existente.
 * Não apaga clientes, telas nem mídias.
 */
async function seed() {
  loadEnvFile();

  const db = getFirestoreDb();
  if (!db) {
    console.error("Firestore indisponível. Confira as variáveis FIREBASE_* no .env.");
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD || "";

  if (!email || password.length < 8) {
    console.error(
      "Defina ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD (8+ caracteres) no .env antes de rodar o seed."
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db
    .collection(COLLECTIONS.USERS)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.set(
      { passwordHash, role: "SUPER_ADMIN", updatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log(`Senha do super admin ${email} atualizada.`);
    return;
  }

  await db.collection(COLLECTIONS.USERS).add({
    name: "Super Admin",
    email,
    passwordHash,
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Super admin ${email} criado. Acesse /login para entrar.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  });
