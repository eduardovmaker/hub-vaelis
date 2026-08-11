import { getFirestoreDb } from "./firebase-admin";
import { COLLECTIONS } from "./db";
import bcrypt from "bcryptjs";

async function clearCollection(db: any, collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  if (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function seedFirebase() {
  const db = getFirestoreDb();
  if (!db) {
    console.error("[Firebase Seed] Não foi possível obter a instância do Firestore. Verifique suas variáveis no .env.");
    process.exit(1);
  }

  console.log("🧹 Limpando dados de teste do Firebase Firestore...");
  await clearCollection(db, COLLECTIONS.USERS);
  await clearCollection(db, COLLECTIONS.TENANTS);
  await clearCollection(db, COLLECTIONS.TV_CONFIGS);
  await clearCollection(db, COLLECTIONS.PORTAL_CONFIGS);
  console.log("✅ Coleções limpas com sucesso.");

  console.log("🔑 Criando o único usuário Master Admin no Firebase...");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  
  await db.collection(COLLECTIONS.USERS).doc("admin@captivehub.com").set({
    name: "Master Admin CaptiveHub",
    email: "admin@captivehub.com",
    passwordHash: adminPasswordHash,
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log("✨ Sucesso! Apenas 1 usuário Master Admin cadastrado no Firebase:");
  console.log("📧 E-mail: admin@captivehub.com");
  console.log("🔑 Senha:  admin123");
}

seedFirebase().catch((err) => {
  console.error("Erro durante o seed do Firebase:", err);
});
