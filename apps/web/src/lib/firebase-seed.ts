import { getFirestoreDb } from "./firebase-admin";
import { COLLECTIONS } from "./db";
import bcrypt from "bcryptjs";
import { INITIAL_TV_CONFIGS } from "../mocks/tv";
import { INITIAL_PORTAL_CONFIGS } from "../mocks/portal";

async function seedFirebase() {
  const db = getFirestoreDb();
  if (!db) {
    console.error("[Firebase Seed] Não foi possível obter instância do Firestore. Verifique suas variáveis de ambiente.");
    process.exit(1);
  }

  console.log("🌱 Iniciando população inicial do Firebase Firestore...");

  // 1. Criar Usuário Super Admin
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await db.collection(COLLECTIONS.USERS).doc("admin@captivehub.com").set({
    name: "Super Admin CaptiveHub",
    email: "admin@captivehub.com",
    passwordHash: adminPasswordHash,
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Usuário Super Admin populado em 'users/admin@captivehub.com'");

  // 2. Populando Tenants Iniciais
  const batch = db.batch();
  for (const [tenantId, tvConfig] of Object.entries(INITIAL_TV_CONFIGS)) {
    const tenantRef = db.collection(COLLECTIONS.TENANTS).doc(tenantId);
    batch.set(tenantRef, {
      tenantName: tvConfig.tenantName,
      category: "FOOD",
      wifiSsid: `${tvConfig.tenantName}_WiFi`,
      primaryColor: "#2563EB",
      pairingCode: tvConfig.pairingCode,
      addonStates: tvConfig.addonStates || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const tvRef = db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId);
    batch.set(tvRef, tvConfig);

    const portalConfig = INITIAL_PORTAL_CONFIGS[tenantId];
    if (portalConfig) {
      const portalRef = db.collection(COLLECTIONS.PORTAL_CONFIGS).doc(tenantId);
      batch.set(portalRef, portalConfig);
    }
  }

  await batch.commit();
  console.log("✅ Tenants, TV Configs e Portal Configs populados com sucesso!");
  console.log("🚀 População do Firebase concluída!");
}

seedFirebase().catch((err) => {
  console.error("Erro durante o seed do Firebase:", err);
});
