import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

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

loadEnvFile();

function getR2Client(): { client: S3Client | null; bucketName: string; publicUrlBase: string } {
  loadEnvFile();
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "hub-vaelis";
  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-1180f0e5896b408295d5ee7ccc556726.r2.dev";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("[Cloudflare R2] Credenciais do R2 não foram fornecidas no .env. Modo de demonstração ativo.");
    return { client: null, bucketName, publicUrlBase };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName, publicUrlBase };
}

export interface UploadR2Params {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string;
}

export async function uploadFileToR2({
  fileBuffer,
  fileName,
  mimeType,
  folder = "midia",
}: UploadR2Params): Promise<{ success: boolean; url: string; key: string; isMock?: boolean }> {
  const extension = path.extname(fileName) || "";
  const sanitizedBaseName = path.basename(fileName, extension).toLowerCase().replace(/[^a-z0-9]/g, "_");
  const uniqueKey = `${folder}/${Date.now()}_${sanitizedBaseName}${extension}`;

  const { client, bucketName, publicUrlBase } = getR2Client();

  if (!client) {
    // Fallback gracioso para apresentação sem R2 configurado
    const mockUrl = `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80`;
    return {
      success: true,
      url: mockUrl,
      key: uniqueKey,
      isMock: true,
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await client.send(command);

    const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${uniqueKey}`;
    return {
      success: true,
      url: publicUrl,
      key: uniqueKey,
    };
  } catch (error: any) {
    console.error("[Cloudflare R2] Erro ao realizar upload para o R2:", error);
    throw new Error(`Falha no upload para o Cloudflare R2: ${error.message || error}`);
  }
}
