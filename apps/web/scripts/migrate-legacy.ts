/**
 * Migra os dados do antigo Vaelis-HUB (captive portal + add-ons) para o modelo
 * de mídia indoor.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-legacy.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-legacy.ts --purge
 *
 * Sem `--purge` nada é apagado: as coleções antigas continuam no Firestore.
 * O script é idempotente — rodar de novo não duplica telas nem playlists.
 */
import { loadEnvFile } from "../src/lib/env";
import { getFirestoreDb } from "../src/lib/firebase-admin";
import { COLLECTIONS, sanitizeForFirestore } from "../src/lib/db";
import { generateDeviceSecret, generateUniquePairingCode } from "../src/lib/screens";
import { parseSpotifyContextUri } from "../src/lib/spotify";
import { DEFAULT_OVERLAYS, type PlaylistItem, type TenantCategory } from "../src/lib/types";

loadEnvFile();

/** Coleções que só existiam para os módulos removidos. */
const LEGACY_COLLECTIONS = [
  "addonStates",
  "asaasConfigs",
  "coupons",
  "googleReviewsConfigs",
  "notifications",
  "portalConfigs",
  "products",
  "radioIndoorConfigs",
  "roletaSorteConfigs",
  "sales",
  "tvConfigs",
  "webGuardConfigs",
  "whatsappBotConfigs",
];

const CATEGORY_MAP: Record<string, TenantCategory> = {
  BARBER: "BARBEARIA",
  FOOD: "RESTAURANTE",
  RETAIL: "VAREJO",
  SERVICES: "OUTRO",
};

/** Deriva a chave do objeto no R2 a partir da URL pública gravada antes. */
function extractR2Key(url: string): string {
  const publicBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (publicBase && url.startsWith(publicBase)) {
    return url.slice(publicBase.length + 1);
  }
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function guessMimeType(url: string): string {
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[extension] || "application/octet-stream";
}

async function main() {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore indisponível. Confira as variáveis FIREBASE_* no .env.");

  const shouldPurge = process.argv.includes("--purge");
  const tenantsSnapshot = await db.collection(COLLECTIONS.TENANTS).get();

  if (tenantsSnapshot.empty) {
    console.log("Nenhum estabelecimento encontrado. Nada a migrar.");
    return;
  }

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const legacy = tenantDoc.data() as Record<string, any>;
    const now = new Date().toISOString();

    console.log(`\n--- ${tenantId} ---`);

    // 1. Estabelecimento: renomeia tenantName -> name e descarta campos do portal.
    const name = legacy.name || legacy.tenantName || tenantId;
    await tenantDoc.ref.set(
      sanitizeForFirestore({
        name,
        category: CATEGORY_MAP[legacy.category] || legacy.category || "OUTRO",
        primaryColor: legacy.primaryColor || "#2563EB",
        timezone: legacy.timezone || "America/Sao_Paulo",
        active: legacy.active !== false,
        createdAt: legacy.createdAt || now,
        updatedAt: now,
      }),
      { merge: true }
    );
    console.log(`  estabelecimento: ${name}`);

    // 2. Playlist e biblioteca, a partir do antigo tvConfigs.
    const tvConfigDoc = await db.collection("tvConfigs").doc(tenantId).get();
    const tvConfig = (tvConfigDoc.exists ? tvConfigDoc.data() : {}) as Record<string, any>;
    const legacyPlaylist = (tvConfig.playlist || []) as Record<string, any>[];

    const existingPlaylists = await db
      .collection(COLLECTIONS.PLAYLISTS)
      .where("tenantId", "==", tenantId)
      .limit(1)
      .get();

    let playlistId = existingPlaylists.empty ? "" : existingPlaylists.docs[0].id;

    if (existingPlaylists.empty) {
      const items: PlaylistItem[] = legacyPlaylist.map((item, index) => ({
        id: String(item.id || `item_${index}`),
        title: String(item.title || `Mídia ${index + 1}`),
        type: item.type === "image" ? "image" : "video",
        url: String(item.url || ""),
        durationSeconds: Number(item.durationSeconds) || (item.type === "image" ? 10 : 15),
        active: item.active !== false,
        // O campo antigo tinha exatamente o mesmo significado do novo.
        muteAudio: item.muteVideoKeepRadio !== false,
        order: index + 1,
      }));

      const playlistRef = db.collection(COLLECTIONS.PLAYLISTS).doc();
      await playlistRef.set(
        sanitizeForFirestore({
          tenantId,
          name: "Playlist principal",
          isDefault: true,
          items,
          createdAt: now,
          updatedAt: now,
        })
      );
      playlistId = playlistRef.id;
      console.log(`  playlist criada com ${items.length} itens`);

      // Registra as mídias na biblioteca para poderem ser reaproveitadas.
      for (const item of items) {
        if (!item.url) continue;
        await db.collection(COLLECTIONS.MEDIA_ASSETS).add(
          sanitizeForFirestore({
            tenantId,
            title: item.title,
            type: item.type,
            url: item.url,
            r2Key: extractR2Key(item.url),
            mimeType: guessMimeType(item.url),
            // O tamanho não era guardado no modelo antigo.
            sizeBytes: 0,
            createdAt: now,
          })
        );
      }
      console.log(`  ${items.length} mídias registradas na biblioteca`);
    } else {
      console.log("  playlist já existente, mantida");
    }

    // 3. Tela, com os overlays herdados da configuração antiga.
    const existingScreens = await db
      .collection(COLLECTIONS.SCREENS)
      .where("tenantId", "==", tenantId)
      .limit(1)
      .get();

    if (existingScreens.empty) {
      const pairingCode = await generateUniquePairingCode();
      await db.collection(COLLECTIONS.SCREENS).add(
        sanitizeForFirestore({
          tenantId,
          name: "TV principal",
          orientation: "LANDSCAPE",
          pairingCode,
          paired: false,
          deviceSecret: generateDeviceSecret(),
          playlistId,
          overlays: {
            ...DEFAULT_OVERLAYS,
            showClock: tvConfig.showClockOverlay !== false,
            showLogo: tvConfig.showHeaderLogo !== false,
            showNowPlaying: tvConfig.showRadioBadge !== false,
            ctaEnabled: !!tvConfig.customCtaEnabled,
            ctaTitle: tvConfig.customCtaTitle || DEFAULT_OVERLAYS.ctaTitle,
            ctaSubtitle: tvConfig.customCtaSubtitle || DEFAULT_OVERLAYS.ctaSubtitle,
            ctaUrl: tvConfig.customCtaUrl || "",
            ctaIntervalMinutes: Number(tvConfig.customCtaIntervalMinutes) || 5,
            ctaDurationSeconds: Number(tvConfig.customCtaDurationSeconds) || 15,
          },
          musicEnabled: true,
          volumePercent: 45,
          createdAt: now,
          updatedAt: now,
        })
      );
      console.log(`  tela criada — código de pareamento: ${pairingCode}`);
    } else {
      console.log("  tela já existente, mantida");
    }

    // 4. Playlist do Spotify. Os tokens antigos não servem: foram emitidos sem
    //    o escopo `streaming`, então o cliente precisa reconectar a conta.
    const radioDoc = await db.collection("radioIndoorConfigs").doc(tenantId).get();
    const radio = (radioDoc.exists ? radioDoc.data() : {}) as Record<string, any>;
    const legacyPlaylistUrl = radio.playlistUrl || tvConfig.radioIndoorConfig?.playlistUrl || "";
    const contextUri = parseSpotifyContextUri(legacyPlaylistUrl);

    if (contextUri) {
      await db.collection(COLLECTIONS.SPOTIFY_ACCOUNTS).doc(tenantId).set(
        sanitizeForFirestore({
          tenantId,
          connected: false,
          displayName: "",
          product: "unknown",
          accessToken: "",
          refreshToken: "",
          expiresAt: new Date(0).toISOString(),
          contextUri,
          playlistName:
            radio.playlistName || tvConfig.radioIndoorConfig?.playlistName || "Playlist do Spotify",
          shuffle: true,
          updatedAt: now,
        }),
        { merge: true }
      );
      console.log(`  playlist do Spotify preservada: ${contextUri} (requer reconectar a conta)`);
    }
  }

  if (shouldPurge) {
    console.log("\n--- removendo coleções dos módulos descontinuados ---");
    for (const name of LEGACY_COLLECTIONS) {
      const snapshot = await db.collection(name).get();
      if (snapshot.empty) continue;

      // Firestore aceita no máximo 500 operações por lote.
      for (let start = 0; start < snapshot.docs.length; start += 400) {
        const batch = db.batch();
        snapshot.docs.slice(start, start + 400).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      console.log(`  ${name}: ${snapshot.size} documentos removidos`);
    }
  } else {
    console.log("\nColeções antigas mantidas. Rode com --purge para removê-las.");
  }

  console.log("\nMigração concluída.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha na migração:", error);
    process.exit(1);
  });
