import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "captivehub-media";
const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-captivehub.r2.dev";

function getR2Client(): S3Client | null {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("[Cloudflare R2] Credenciais do R2 não foram fornecidas no .env. Modo de demonstração ativo.");
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export const r2Client = getR2Client();

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

  const client = getR2Client();

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
