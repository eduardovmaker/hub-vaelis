/**
 * Script GENÉRICO para ativar o add-on Mídia Indoor e Rádio Indoor de QUALQUER tenant no Firebase.
 * Uso: npx ts-node scripts/activate-tenant.ts <tenantId> [nomeExibicao]
 * Exemplo: npx ts-node scripts/activate-tenant.ts tenant_martinelli_barbearia_8598 "Martinelli Barbearia"
 */
import { getFirestoreDb } from "../src/lib/firebase-admin";
import { COLLECTIONS } from "../src/lib/db";
import path from "path";
import fs from "fs";

function loadEnvFile() {
  if (process.env.FIREBASE_PROJECT_ID) return;
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  } catch (e) {}
}

async function activateTenant() {
  const tenantId = process.argv[2];
  const customName = process.argv[3];

  if (!tenantId) {
    console.error("❌ Favor informar o ID da tenant.");
    console.log("📌 Uso: npx ts-node scripts/activate-tenant.ts <tenantId> [tenantName]");
    console.log("   Exemplo: npx ts-node scripts/activate-tenant.ts tenant_martinelli_barbearia_8598 'Martinelli Barbearia'");
    process.exit(1);
  }

  loadEnvFile();
  const db = getFirestoreDb();
  if (!db) {
    console.error("❌ Firebase não inicializado.");
    process.exit(1);
  }

  const derivedName = tenantId
    .replace(/^tenant_/, "")
    .replace(/_\d+$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const tenantName = customName || derivedName || tenantId;

  console.log(`🔧 Ativando Mídia Indoor e Rádio para ${tenantId} (${tenantName})...`);

  // Atualiza tvConfigs no Firestore
  await db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).set(
    {
      tenantId,
      tenantName,
      addonActive: true,
      showQrOverlay: true,
      showClockOverlay: true,
      showRadioBadge: true,
      showTitleOverlay: true,
      showHeaderLogo: true,
      addonStates: {
        "midia-indoor": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
        "radio-indoor": { active: true, paymentStatus: "PAID", planCycle: "MENSAL" },
      },
    },
    { merge: true }
  );

  console.log("✅ tvConfigs atualizado com sucesso no Firebase!");
  console.log(`   - tenantId: ${tenantId}`);
  console.log(`   - tenantName: ${tenantName}`);
  console.log("   - addonActive: true");
}

activateTenant().catch((err) => {
  console.error("❌ Erro ao ativar tenant:", err);
  process.exit(1);
});
