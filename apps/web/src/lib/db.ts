import { getFirestoreDb } from "./firebase-admin";
import { PrismaClient } from "@prisma/client";

// Firebase Firestore Database Instance
export const db = getFirestoreDb();

// Constantes de Coleções do Firestore
export const COLLECTIONS = {
  USERS: "users",
  TENANTS: "tenants",
  ADDON_STATES: "addonStates",
  PORTAL_CONFIGS: "portalConfigs",
  TV_CONFIGS: "tvConfigs",
  RADIO_INDOOR_CONFIGS: "radioIndoorConfigs",
  GOOGLE_REVIEWS_CONFIGS: "googleReviewsConfigs",
  WHATSAPP_BOT_CONFIGS: "whatsappBotConfigs",
  ROLETA_SORTE_CONFIGS: "roletaSorteConfigs",
  WEB_GUARD_CONFIGS: "webGuardConfigs",
  PRODUCTS: "products",
  SALES: "sales",
  ASAAS_CONFIGS: "asaasConfigs",
} as const;

// Legacy Prisma Instance com tratativa de fallback gracioso
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
