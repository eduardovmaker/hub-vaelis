/**
 * Libera CORS no bucket do Cloudflare R2.
 *
 * Sem isso o navegador não consegue enviar o vídeo direto para o bucket pela
 * URL presignada — o PUT é bloqueado antes de sair.
 *
 * Uso: npx ts-node scripts/configure-r2-cors.ts
 */
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { loadEnvFile } from "../src/lib/env";

loadEnvFile();

async function configureCors() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error("Defina as variáveis CLOUDFLARE_R2_* no .env antes de rodar este script.");
    process.exit(1);
  }

  // Origens que podem enviar arquivos: o painel local e o domínio publicado.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigins = Array.from(
    new Set([appUrl.replace(/\/$/, ""), "http://localhost:3000"])
  );

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: allowedOrigins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["content-type", "cache-control"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );

  console.log(`CORS configurado no bucket ${bucketName} para: ${allowedOrigins.join(", ")}`);
}

configureCors().catch((error) => {
  console.error("Falha ao configurar CORS:", error);
  process.exit(1);
});
