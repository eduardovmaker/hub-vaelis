/**
 * Script para configurar CORS no bucket R2 do Cloudflare.
 * Permite uploads diretos do browser via presigned URLs.
 * 
 * Uso: npx ts-node scripts/configure-r2-cors.ts
 */
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";

function loadEnvFile() {
  if (process.env.CLOUDFLARE_R2_ACCOUNT_ID) return;
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

async function configureCors() {
  loadEnvFile();

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "hub-vaelis";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("❌ Credenciais do R2 não encontradas no .env");
    process.exit(1);
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log(`🔧 Configurando CORS no bucket "${bucketName}"...`);

  const command = new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [
            "https://hub-vaelis.vercel.app",
            "http://localhost:3000",
            "http://localhost:3001",
          ],
          AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag", "x-amz-request-id"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  await client.send(command);
  console.log("✅ CORS configurado com sucesso no bucket R2!");
  console.log("   Origens permitidas:");
  console.log("   - https://hub-vaelis.vercel.app");
  console.log("   - http://localhost:3000");
  console.log("   - http://localhost:3001");
  console.log("   Métodos: GET, PUT, POST, HEAD");
}

configureCors().catch((err) => {
  console.error("❌ Erro ao configurar CORS:", err);
  process.exit(1);
});
