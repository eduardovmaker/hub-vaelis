const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");

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

loadEnvFile();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

async function createAdminUser() {
  const email = "dudis.tadeu@gmail.com";
  const rawPassword = process.env.ADMIN_INITIAL_PASSWORD || "VaelisHub@2026!Prod";
  const name = "Eduardo Tadeu (Super Admin)";

  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.warn("⚠️  ADMIN_INITIAL_PASSWORD não definida no .env. Utilizando senha temporária inicial de produção.");
  }

  console.log(`🔑 Gerando hash seguro para a senha...`);
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  console.log(`💾 Criando/Atualizando usuário ${email} no Firebase Firestore...`);
  await db.collection("users").doc(email).set({
    name,
    email,
    passwordHash,
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`🎉 SUCCESS: Usuário Super Admin criado/atualizado com sucesso no Firebase Firestore!`);
  console.log(`📧 E-mail: ${email}`);
  console.log(`🛡️ Função: SUPER_ADMIN`);
}

createAdminUser().then(() => process.exit(0)).catch((err) => {
  console.error("❌ Erro ao criar usuário admin:", err);
  process.exit(1);
});
