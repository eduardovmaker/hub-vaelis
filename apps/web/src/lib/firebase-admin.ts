import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { loadEnvFile, readEnv } from "./env";

loadEnvFile();

/**
 * Nenhum caminho aqui pode lançar durante o import: este módulo é carregado
 * quando o Next monta as rotas, e uma credencial malformada derrubaria o build
 * em vez de apenas deixar o banco indisponível em tempo de execução.
 */
function getFirebaseAdminApp() {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  const projectId = readEnv("FIREBASE_PROJECT_ID");
  const clientEmail = readEnv("FIREBASE_CLIENT_EMAIL");
  // A chave vem do .env com \n escapado; o SDK espera quebras reais.
  const privateKey = readEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const serviceAccountJson = readEnv("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (serviceAccountJson) {
    try {
      return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    } catch (error) {
      console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY inválida:", error);
    }
  }

  if (projectId && clientEmail && privateKey) {
    try {
      return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } catch (error) {
      console.warn("[Firebase Admin] Credenciais FIREBASE_* inválidas:", error);
    }
  }

  // Ambientes Google (Cloud Run, GCE) resolvem a credencial sozinhos.
  try {
    return initializeApp({ credential: applicationDefault() });
  } catch {
    // Sem credencial alguma: inicializa vazio para o app subir e as rotas
    // responderem "banco indisponível" em vez de estourar no import.
    return initializeApp({ projectId: projectId || "vaelis-indoor-dev" });
  }
}

let cachedApp: ReturnType<typeof initializeApp> | null = null;

try {
  cachedApp = getFirebaseAdminApp();
} catch (error) {
  console.error("[Firebase Admin] Não foi possível inicializar o SDK:", error);
}

export const firebaseAdminApp = cachedApp;

export const getFirestoreDb = () => {
  if (!firebaseAdminApp) return null;
  try {
    return getFirestore(firebaseAdminApp);
  } catch (error) {
    console.warn("[Firebase Admin] Firestore não pôde ser inicializado:", error);
    return null;
  }
};
