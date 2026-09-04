import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { loadEnvFile } from "./env";

loadEnvFile();

function getFirebaseAdminApp() {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // A chave vem do .env com \n escapado; o SDK espera quebras reais.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
      });
    } catch (error) {
      console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido:", error);
    }
  }

  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
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

export const firebaseAdminApp = getFirebaseAdminApp();

export const getFirestoreDb = () => {
  try {
    return getFirestore(firebaseAdminApp);
  } catch (error) {
    console.warn("[Firebase Admin] Firestore não pôde ser inicializado:", error);
    return null;
  }
};
