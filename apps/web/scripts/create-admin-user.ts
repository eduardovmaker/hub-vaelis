import { getFirestoreDb } from "../src/lib/firebase-admin";
import { COLLECTIONS } from "../src/lib/db";
import bcrypt from "bcryptjs";
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

async function createAdminUser() {
  loadEnvFile();
  const db = getFirestoreDb();
  if (!db) {
    console.error("❌ Não foi possível inicializar o Firebase Firestore.");
    process.exit(1);
  }

  const email = "dudis.tadeu@gmail.com";
  const rawPassword = "Eusou!@lenda01";
  const name = "Eduardo Tadeu (Master Admin)";

  console.log(`🔑 Gerando hash para a senha...`);
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  console.log(`💾 Criando/Atualizando usuário ${email} no Firebase Firestore...`);
  await db.collection(COLLECTIONS.USERS).doc(email).set({
    name,
    email,
    passwordHash,
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`🎉 Sucesso! Usuário Master Admin criado/atualizado com sucesso no Firebase:`);
  console.log(`📧 E-mail: ${email}`);
  console.log(`🔑 Senha:  ${rawPassword}`);
  console.log(`🛡️ Função: SUPER_ADMIN`);
}

createAdminUser().catch((err) => {
  console.error("❌ Erro ao criar usuário admin:", err);
  process.exit(1);
});
