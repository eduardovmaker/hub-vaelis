import { NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/session";
import {
  MAX_SERVER_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  getPresignedR2UploadUrl,
  resolveMediaType,
  uploadFileToR2,
} from "@/lib/r2";

export const maxDuration = 60;

/**
 * Gera a URL presignada para o navegador enviar o arquivo direto ao R2.
 * É o caminho usado para vídeo: o corpo da requisição na Vercel não aguenta.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = (searchParams.get("tenantId") || "").replace(/[^\w-]/g, "");
  const fileName = searchParams.get("fileName") || "";
  const mimeType = searchParams.get("mimeType") || "";
  const folder = searchParams.get("folder") || "midia";
  const sizeBytes = Number(searchParams.get("sizeBytes")) || 0;

  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Informe o tenantId." }, { status: 400 });
  }

  const auth = requireTenantAccess(request, tenantId);
  if ("response" in auth) return auth.response;

  if (!fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "Informe o nome e o tipo do arquivo." },
      { status: 400 }
    );
  }

  if (!resolveMediaType(mimeType)) {
    return NextResponse.json(
      { success: false, error: `Formato não suportado: ${mimeType}. Use MP4, WebM, MOV, JPG, PNG ou WebP.` },
      { status: 400 }
    );
  }

  if (sizeBytes > MAX_UPLOAD_BYTES) {
    const limitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return NextResponse.json(
      { success: false, error: `Arquivo acima do limite de ${limitMb} MB.` },
      { status: 400 }
    );
  }

  try {
    const presigned = await getPresignedR2UploadUrl({ tenantId, fileName, mimeType, folder });
    return NextResponse.json({
      success: true,
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.url,
      key: presigned.key,
    });
  } catch (error) {
    console.error("Erro ao gerar URL presignada no R2:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao preparar o upload." },
      { status: 500 }
    );
  }
}

/** Upload pelo servidor, adequado a arquivos pequenos como logo do cliente. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tenantId = String(formData.get("tenantId") || "").replace(/[^\w-]/g, "");
    const folder = String(formData.get("folder") || "midia");

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Informe o tenantId." }, { status: 400 });
    }

    const auth = requireTenantAccess(request, tenantId);
    if ("response" in auth) return auth.response;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (!resolveMediaType(file.type)) {
      return NextResponse.json(
        { success: false, error: `Formato não suportado: ${file.type}.` },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.length > MAX_SERVER_UPLOAD_BYTES) {
      const limitMb = Math.round(MAX_SERVER_UPLOAD_BYTES / (1024 * 1024));
      return NextResponse.json(
        {
          success: false,
          error: `Acima de ${limitMb} MB este upload precisa ir direto ao R2. Use a URL presignada.`,
        },
        { status: 413 }
      );
    }

    const result = await uploadFileToR2({
      tenantId,
      fileBuffer,
      fileName: file.name,
      mimeType: file.type,
      folder,
    });

    return NextResponse.json({ success: true, url: result.url, key: result.key });
  } catch (error) {
    console.error("Erro no upload para o R2:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro no upload." },
      { status: 500 }
    );
  }
}
