/**
 * Script para ativar o add-on Mídia Indoor de uma tenant no Firebase.
 * Corrige tenants que têm playlist mas addonActive = false.
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
  loadEnvFile();
  const db = getFirestoreDb();
  if (!db) {
    console.error("❌ Firebase não inicializado.");
    process.exit(1);
  }

  const tenantId = "tenant_martinelli_barbearia_8598";

  console.log(`🔧 Ativando Mídia Indoor para ${tenantId}...`);

  // Atualiza tvConfigs
  await db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).set({
    tenantName: "Martinelli Barbearia",
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
    radioIndoorConfig: {
      provider: "spotify",
      playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      playlistName: "Hits Sertanejo & Pop Barbearia (Spotify)",
      spotIntervalMinutes: 15,
      syncWithSmartTv: true,
      spotMessages: [],
    },
  }, { merge: true });

  console.log("✅ tvConfigs atualizado:");
  console.log("   - tenantName: Martinelli Barbearia");
  console.log("   - addonActive: true");

  // Verifica se a playlist está lá
  const doc = await db.collection(COLLECTIONS.TV_CONFIGS).doc(tenantId).get();
  const data = doc.data();
  console.log(`📋 Playlist atual: ${data?.playlist?.length || 0} itens`);
  if (data?.playlist) {
    data.playlist.forEach((item: any, i: number) => {
      console.log(`   ${i + 1}. ${item.title} (${item.type}) - active: ${item.active}`);
    });
  }
}

activateTenant().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
