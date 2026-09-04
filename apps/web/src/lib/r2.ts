import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { loadEnvFile } from "./env";
import type { MediaType } from "./types";

/**
 * Armazenamento das mídias no Cloudflare R2.
 *
 * Vídeos costumam passar do limite de corpo de requisição da Vercel, então o
 * caminho principal é a URL presignada: o navegador envia o arquivo direto
 * para o R2 e só a chave do objeto volta para o servidor.
 */

loadEnvFile();

/** Tipos aceitos na biblioteca de mídia, com o tipo de exibição de cada um. */
export const ALLOWED_MEDIA_TYPES: Record<string, MediaType> = {
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

/** Teto por arquivo. Vídeo de mídia indoor raramente passa disso. */
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

/** Upload via servidor: a Vercel limita o corpo da requisição a ~4.5 MB. */
export const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;

export function resolveMediaType(mimeType: string): MediaType | null {
  return ALLOWED_MEDIA_TYPES[mimeType.toLowerCase()] || null;
}

interface R2Context {
  client: S3Client;
  bucketName: string;
  publicUrlBase: string;
}

/**
 * Monta o cliente do R2. Lança erro quando falta configuração — gravar mídia
 * em um destino falso deixaria a tela exibindo conteúdo que ninguém enviou.
 */
function getR2Context(): R2Context {
  loadEnvFile();

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  const missing = [
    !accountId && "CLOUDFLARE_R2_ACCOUNT_ID",
    !accessKeyId && "CLOUDFLARE_R2_ACCESS_KEY_ID",
    !secretAccessKey && "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    !bucketName && "CLOUDFLARE_R2_BUCKET_NAME",
    !publicUrlBase && "CLOUDFLARE_R2_PUBLIC_URL",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Cloudflare R2 não configurado. Defina no .env: ${missing.join(", ")}.`
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  });

  return {
    client,
    bucketName: bucketName!,
    publicUrlBase: publicUrlBase!.replace(/\/$/, ""),
  };
}

export function isR2Configured(): boolean {
  try {
    getR2Context();
    return true;
  } catch {
    return false;
  }
}

/** Chave previsível e isolada por estabelecimento: tenants/<id>/<pasta>/<arquivo>. */
function buildObjectKey(tenantId: string, fileName: string, folder: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const base = path
    .basename(fileName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "midia";

  const safeTenant = tenantId.replace(/[^\w-]/g, "") || "sem-tenant";
  const safeFolder = folder.replace(/[^\w-]/g, "") || "midia";

  return `tenants/${safeTenant}/${safeFolder}/${Date.now()}-${base}${extension}`;
}

export interface UploadResult {
  url: string;
  key: string;
}

/** Envio direto pelo servidor. Use só para arquivos pequenos (logos, imagens). */
export async function uploadFileToR2(params: {
  tenantId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string;
}): Promise<UploadResult> {
  const { client, bucketName, publicUrlBase } = getR2Context();
  const key = buildObjectKey(params.tenantId, params.fileName, params.folder || "midia");

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: params.fileBuffer,
      ContentType: params.mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { url: `${publicUrlBase}/${key}`, key };
}

export interface PresignedUpload extends UploadResult {
  uploadUrl: string;
}

/**
 * URL presignada para o navegador enviar o vídeo direto ao R2.
 * O PUT do navegador precisa repetir exatamente o mesmo Content-Type.
 */
export async function getPresignedR2UploadUrl(params: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  folder?: string;
}): Promise<PresignedUpload> {
  const { client, bucketName, publicUrlBase } = getR2Context();
  const key = buildObjectKey(params.tenantId, params.fileName, params.folder || "midia");

  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: params.mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn: 3600 }
  );

  return { uploadUrl, url: `${publicUrlBase}/${key}`, key };
}

/** Remove o objeto do bucket ao excluir uma mídia da biblioteca. */
export async function deleteFileFromR2(key: string): Promise<void> {
  if (!key) return;
  const { client, bucketName } = getR2Context();
  await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}
