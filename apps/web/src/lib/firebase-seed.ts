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
  await clearCollection(db, COLLECTIONS.RADIO_INDOOR_CONFIGS);
  await clearCollection(db, COLLECTIONS.ASAAS_CONFIGS);
  await clearCollection(db, COLLECTIONS.PRODUCTS);
  await clearCollection(db, COLLECTIONS.SALES);
  console.log("✅ Coleções limpas com sucesso.");

  const adminEmail = "dudis.tadeu@gmail.com";
  const rawPassword = process.env.ADMIN_INITIAL_PASSWORD || "VaelisHub@2026!Prod";

  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.warn("⚠️  ADMIN_INITIAL_PASSWORD não definida no .env. Utilizando senha temporária inicial de produção.");
  }

  console.log(`🔑 Criando o único usuário Super Admin (${adminEmail}) no Firebase...`);
  const adminPasswordHash = await bcrypt.hash(rawPassword, 10);
  
  await db.collection(COLLECTIONS.USERS).doc(adminEmail).set({
    name: "Eduardo Tadeu (Super Admin)",
    email: adminEmail,
    passwordHash: adminPasswordHash,
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log("✨ Sucesso! Apenas 1 usuário Super Admin cadastrado no Firebase:");
  console.log(`📧 E-mail: ${adminEmail}`);
  console.log(`🛡️  Role:   SUPER_ADMIN`);
}

seedFirebase().catch((err) => {
  console.error("Erro durante o seed do Firebase:", err);
});

