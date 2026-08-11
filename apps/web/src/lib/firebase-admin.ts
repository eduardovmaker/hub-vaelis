import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  // Se houver chave JSON completa via FIREBASE_SERVICE_ACCOUNT_KEY
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.warn("[Firebase Admin] Falha ao analisar FIREBASE_SERVICE_ACCOUNT_KEY JSON:", e);
    }
  }

  // Inicialização via credenciais individuais
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // Fallback padrão se Application Default Credentials (ADC) estiver configurado
  try {
    return initializeApp({
      credential: applicationDefault(),
    });
  } catch (e) {
    // Se não houver credenciais configuradas ainda, inicializa em modo dev gracioso
    return initializeApp({
      projectId: projectId || "captivehub-dev",
    });
  }
}

export const firebaseAdminApp = getFirebaseAdminApp();

export const getFirestoreDb = () => {
  try {
    return getFirestore(firebaseAdminApp);
  } catch (err) {
    console.warn("[Firebase Admin] Firestore não pôde ser inicializado:", err);
    return null;
  }
};
